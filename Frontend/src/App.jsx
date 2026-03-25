import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { useAuth } from './features/auth/hook/useAuth'
import { router } from './app.routes'
import { useEffect, useRef } from 'react'

// The app is route-driven, so this component only mounts the router.
function App(){
    const auth = useAuth()
    const sessionRequestedRef = useRef(false)

    useEffect(()=>{
        if (sessionRequestedRef.current) {
          return
        }

        sessionRequestedRef.current = true
        auth.handleGetme()
    },[])

    return(
        <RouterProvider router={router} />
    )
}



export default App
