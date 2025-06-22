export const createAuthSlice = (set) => ({
  userInfo: undefined,
  setUserInfo: (userInfo) => set({ userInfo }),
  toggleDmInUserInfo: (isDmClosed) =>
    set((state) => ({
      userInfo: { ...state.userInfo, isDmClosed },
    })),
});
