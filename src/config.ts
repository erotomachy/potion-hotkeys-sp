import { on, once, printConsole, DxScanCode, settings, getExtraContainerChanges, Game, Perk, Weapon, WeaponType, Armor, Actor, Spell, ExtraCount, EquipEvent, SlotMask, Faction, Keyword, Menu, hooks, Debug } from "skyrimPlatform"

export interface Config {
    doublePressThreshold: number;
    longPressThreshold: number;
    hotkeys: HotkeyDefinition[];
}

type Types = "string" | "number" | "boolean" | "object";
export function asConfig(data: unknown): Config {
    const keyValidators: Record<keyof Config, Types> = {
        doublePressThreshold: "number",
        longPressThreshold: "number",
        hotkeys: "object"
    }

    if (typeof data === 'object' && data !== null) {
        let maybeConfig = data as Config
        for (const key of Object.keys(keyValidators) as Array<keyof Config>) {
            if (typeof maybeConfig[key] !== keyValidators[key]) {
                throw new Error(`data is not a Config: ${key} has type ${typeof maybeConfig[key]}`);
            }
            if (key === "hotkeys") {
                const maybeHotkeys = maybeConfig[key];
                maybeHotkeys.map(maybeHotkey => asHotkey(maybeHotkey));
            }
        }
        return maybeConfig;
    }

    throw new Error('data is not a Config');
}

type Precedence = "Min" | "Max";
type PressMode = "Single" | "Double" | "Long";
export interface HotkeyDefinition {
    readonly effectName: string; 
    readonly precedence: Precedence; 
    readonly key: number; 
    readonly modifier: number | null;
    readonly mode: PressMode;
}

export function asHotkey(data: unknown): HotkeyDefinition {
    const keyValidators: Record<keyof HotkeyDefinition, Types> = {
        effectName: "string",
        precedence: "string",
        key: "number",
        modifier: "number",
        mode: "string",
    }

    if (typeof data === 'object' && data !== null) {
        let maybeHotkey = data as HotkeyDefinition
        for (const key of Object.keys(keyValidators) as Array<keyof HotkeyDefinition>) {
            if (key === "modifier") {
                if (maybeHotkey[key] !== undefined && typeof maybeHotkey[key] !== keyValidators[key]) {
                    throw new Error(`data is not a Hotkey: ${key} has type ${typeof maybeHotkey[key]}`);
                }
            } else if (typeof maybeHotkey[key] !== keyValidators[key]) {
                throw new Error(`data is not a Hotkey: ${key} has type ${typeof maybeHotkey[key]}`);
            }
        }
        return maybeHotkey;
    }

    throw new Error('data is not a Hotkey');
}
