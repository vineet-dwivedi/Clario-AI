import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuth } from './features/auth/hook/useAuth'
import { router } from './app.routes'
import { useEffect } from 'react'

// The app is route-driven, so this component only mounts the router.
function App(){
    const auth = useAuth()
    useEffect(()=>{
        auth.handleGetme()
    },[])

    return(
        <RouterProvider router={router} />
    )
}



export default App
