Scriptname POHK_ModEventListener extends ReferenceAlias  

Actor player

Event OnInit()
	player = GetReference() As Actor
	RegisterForModEvent("PotionHotkeyActivated", "OnPotionHotkeyActivated")
EndEvent

Event OnPlayerLoadGame()
	player = GetReference() As Actor
	RegisterForModEvent("PotionHotkeyActivated", "OnPotionHotkeyActivated")
EndEvent

Event OnPotionHotkeyActivated(int potionFormIdHigh, int potionFormIdLow)
	player.EquipItem(Game.GetFormEx(1000 * potionFormIdHigh + potionFormIdLow), false, true)
EndEvent
