import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useChat } from '../hook/useChat';

const Dashboard = () => {
    const chat = useChat();
    const { user } = useSelector(state=>state.auth);

    useEffect(()=>{
        chat.initializeSocketConnection()
    },[])
  return (
    <div>
      
    </div>
  )
}

export default Dashboard
