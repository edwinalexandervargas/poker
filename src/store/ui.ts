import { create } from 'zustand'

// UI-only state. Real game state lives in Firestore and is written by Cloud Functions.
interface UiState {
  playerName: string
  setPlayerName: (name: string) => void
  /** Bet the player is composing in the raise slider (not yet submitted). */
  pendingBet: number
  setPendingBet: (amount: number) => void
}

export const useUiStore = create<UiState>((set) => ({
  playerName: '',
  setPlayerName: (playerName) => set({ playerName }),
  pendingBet: 0,
  setPendingBet: (pendingBet) => set({ pendingBet }),
}))
