import { on, once, printConsole, Potion, settings, Game, Debug, Utility, Input, MagicEffect } from "skyrimPlatform"
import * as sp from "skyrimPlatform"
import { asConfig } from "config"

enum Precedence {
    Max,
    Min
}

enum PressMode {
    Single,
    Double,
    Long
}

enum KeyState {
    Ready,
    Struck,
    Fired,
    Recocking
}

class KeyStateMachine {
    readonly key: number;
    modifierKey: number | undefined;
    state: KeyState;
    accumulatedTime: number;

    constructor(key: number) {
        this.key = key;
        this.modifierKey = undefined;
        this.state = KeyState.Ready;
        this.accumulatedTime = 0.0;
    }
}

class Hotkey {
    readonly effectName: string; 
    readonly precedence: Precedence; 
    readonly key: number; 
    readonly modifier: number | undefined;
    readonly mode: PressMode;
    
    constructor(effectName: string, precedence: Precedence, key: number, modifier: number | null, mode: PressMode) {
        this.effectName = effectName;
        this.precedence = precedence;
        this.key = key;
        this.modifier = modifier === null ? undefined : modifier!;
        this.mode = mode;
    }
}

let keyStateMachines: KeyStateMachine[];
let possibleModifiers: number[];
let hotkeyMap: Map<number, Hotkey>;

export let main = () => {

    const config = asConfig(settings['potion-hotkeys-sp']);
    let lastTime = 0.0;

    const uniqueHotkeys = new Set(config.hotkeys.map(hotkey => hotkey.key));
    keyStateMachines = Array.from(uniqueHotkeys.values()).map(key => new KeyStateMachine(key));

    const uniqueModifers = new Set(config.hotkeys.map(hotkey => hotkey.modifier));
    possibleModifiers = Array.from(uniqueModifers.values()).filter(key => key !== null).map(key => key!);

    const hotkeys = config.hotkeys.map(def => new Hotkey(def.effectName, Precedence[def.precedence], def.key, def.modifier, PressMode[def.mode]));
    hotkeyMap = new Map(hotkeys.map(hotkey => [getKey(hotkey.key, hotkey.modifier, hotkey.mode), hotkey])); 

    once('update', () => {
        initialize();
    });

    on('loadGame', () => {
        initialize();
    });

    function initialize() {
        lastTime = Utility.getCurrentRealTime();

        printConsole(`Potion Hotkeys SP initialized. Monitoring ${keyStateMachines.length} keys`);
    }

    on('update', () => {
        const now = Utility.getCurrentRealTime();
        const timeDiff =  now - lastTime;
        lastTime = now;

        if (timeDiff === 0.0 || Utility.isInMenuMode()) {
            return;
        }

        for (const machine of keyStateMachines) {
            update(machine, timeDiff);
        }
    });

    function update(machine: KeyStateMachine, timeDiff: number) {
        switch (machine.state) {
            case KeyState.Ready:
                if (Input.isKeyPressed(machine.key)) {
                    machine.state = KeyState.Struck;
                    machine.modifierKey = possibleModifiers.find(key => Input.isKeyPressed(key));
                    machine.accumulatedTime = 0.0;
                }
                break;
            case KeyState.Struck:
                if (Input.isKeyPressed(machine.key)) {
                    machine.accumulatedTime += timeDiff;
                    if (machine.accumulatedTime > config.longPressThreshold) {
                        handleEvent(machine.key, machine.modifierKey, PressMode.Long);
                        machine.state = KeyState.Recocking;
                    }
                } else {
                    machine.state = KeyState.Fired;
                    machine.accumulatedTime = 0.0;
                }
                break;
            case KeyState.Recocking:
                if (!Input.isKeyPressed(machine.key)) {
                    machine.state = KeyState.Ready;
                }
                break;
            case KeyState.Fired:
                if (Input.isKeyPressed(machine.key)) {
                    handleEvent(machine.key, machine.modifierKey, PressMode.Double);
                    machine.state = KeyState.Recocking;
                } else {
                    machine.accumulatedTime += timeDiff;
                    if (machine.accumulatedTime > config.doublePressThreshold) {
                        handleEvent(machine.key, machine.modifierKey, PressMode.Single);
                        machine.state = KeyState.Ready;
                    }
                }
                break;
        }
    }

    function handleEvent(key: number, modifier: number | undefined, mode: PressMode) {
        const hotkey = hotkeyMap.get(getKey(key, modifier, mode));
        if (!hotkey) {
            return;
        }
        activateHotkey(hotkey);
    }

    function activateHotkey(hotkey: Hotkey) {
        const player = Game.getPlayer()!;
        let currentBestPotionId: number | null = null;
        let currentBestEfficacy: number | null = null;

        const potions = Array.from(Array(player.getNumItems()).keys())
                             .map(idx => Potion.from(player.getNthForm(idx)))
                             .filter(potion => potion && !potion.isFood())
                             .map(potion => potion!);

        for (const potion of potions) {
            const efficacy = evaluatePotion(hotkey.effectName, potion, hotkey.precedence, currentBestEfficacy);

            if (efficacy === null) {
                continue;
            }

            currentBestPotionId = potion.getFormID();
            currentBestEfficacy = efficacy;
        }

        if (currentBestPotionId === null) {
            Debug.notification(`You don't have any more ${hotkey.effectName} potions.`);
            return;
        }

        const ModEvent = (sp as any).ModEvent;
        const handle = ModEvent.Create('PotionHotkeyActivated');
        ModEvent.PushInt(handle, Math.floor(currentBestPotionId / 1000));
        ModEvent.PushInt(handle, currentBestPotionId % 1000);
        ModEvent.Send(handle);
    }

    function getKey(key: number, modifier: number | undefined, mode: PressMode) {
        return key + 1000 * (modifier || 0) + 10000 * mode;
    }

    function evaluatePotion(effectName: string, potion: Potion, precedence: Precedence, currentBestEfficacy: number | null) {
        const effects = potion.getMagicEffects()?.map(effect => MagicEffect.from(effect)!);
        if (!effects) {
            return null;
        }

        let durations: Array<number> | null = null;
        let magnitudes: Array<number> | null = null;

        const getDurations = () => durations || (durations = potion.getEffectDurations()!);
        const getMagnitudes = () => magnitudes || (magnitudes = potion.getEffectMagnitudes()!);

        for (let idx = 0; idx < effects.length; idx++) {
            if (effects[idx].getName() !== effectName)
                continue;
            
            const duration = getDurations()[idx];
            const magnitude = getMagnitudes()[idx];
            const efficacy = (duration === 0 ? 1 : duration) * magnitude;

            if (currentBestEfficacy === null 
                || (precedence === Precedence.Max && efficacy > currentBestEfficacy!) 
                || (precedence === Precedence.Min && efficacy < currentBestEfficacy!)) {
                    return efficacy;
            }
        }

        return null;
    }
};
