import  { useDispatch } from "react-redux";
import { login,register,getme } from "../service/auth.api";
import { setUser,setError,setLoading } from "../auth.slice";

// Keeps the UI layer simple by turning backend responses into Redux state updates.
const getApiErrorMessage = (error, fallbackMessage) => {
    return (
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        fallbackMessage
    );
};

const normalizeUser = (user) => {
    if (!user) {
        return null;
    }

    return {
        ...user,
        username: user.username ?? user.userrname ?? "",
    };
};

export function useAuth(){
    const dispatch = useDispatch();

    async function handleRegister({email,username,password}) {
        try{
            dispatch(setLoading(true))
            dispatch(setError(null))
            const data = await register({email,username,password})
            return data;
        }catch(error){
            dispatch(setError(getApiErrorMessage(error, "Registration failed")))
            return null;
        }finally{
            dispatch(setLoading(false))
        }
    }

    async function handleLogin({email,password}) {
        try{
            dispatch(setLoading(true))
            dispatch(setError(null))
            const data = await login({email,password})
            dispatch(setUser(normalizeUser(data.user)))
            return data;
        }catch(error){
            dispatch(setError(getApiErrorMessage(error, "Login failed")))
            return null;
        }finally{
            dispatch(setLoading(false))
        }
    }

    async function handleGetme() {
        try{
            dispatch(setLoading(true))
            dispatch(setError(null))
            const data = await getme()
            dispatch(setUser(normalizeUser(data.user)))
            return data;
        }catch(error){
            dispatch(setError(getApiErrorMessage(error, "Failed to fetch user data")))
            return null;
        }finally{
            dispatch(setLoading(false))
        }
    }

    return{handleGetme,handleLogin,handleRegister}
}
