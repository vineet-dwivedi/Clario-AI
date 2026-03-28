import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from './features/auth/hook/useAuth'
import { router } from './app.routes'

// The app is route-driven, so this component only mounts the router.
function App(){
    const auth = useAuth()

    useEffect(()=>{
        auth.handleAppStart()
    },[])

    return(
        <RouterProvider router={router} />
    )
}



export default App
