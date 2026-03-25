import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

/**
 * Keeps authenticated users out of login and register screens.
 */
const PublicOnly = ({ children }) => {
  const { initialized, user } = useSelector((state) => state.auth)

  if (!initialized) {
    return <div className="route-gate">Checking session...</div>
  }

  if (user) {
    return <Navigate replace to="/" />
  }

  return children
}

export default PublicOnly
