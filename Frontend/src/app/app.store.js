import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/auth.slice"

// Central app store. Auth pages read loading/error/user from here.
export const store = configureStore({
    reducer: {auth: authReducer}
})
