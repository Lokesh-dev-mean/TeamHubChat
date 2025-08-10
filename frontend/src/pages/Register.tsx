import React,{ useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore' 

const Register = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    tenantName: ''
  })
  
  const [passwordError, setPasswordError] = useState('')
  const { register, error, loading } = useAuthStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear password error when user types
    if ((name === 'password' || name === 'confirmPassword') && passwordError) {
      setPasswordError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (userData.password !== userData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    
    const { confirmPassword, ...registerData } = userData
    await register(registerData)
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Register for TeamHub</h1>
        
        {(error || passwordError) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error || passwordError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="flex space-x-4">
            <div className="form-group w-1/2">
              <label htmlFor="firstName" className="form-label">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                className="input"
                value={userData.firstName}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group w-1/2">
              <label htmlFor="lastName" className="form-label">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className="input"
                value={userData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username*
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className="input"
              value={userData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email*
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="input"
              value={userData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password*
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="input"
              value={userData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password*
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              className="input"
              value={userData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="tenantName" className="form-label">
              Organization Name (Optional)
            </label>
            <input
              type="text"
              id="tenantName"
              name="tenantName"
              className="input"
              value={userData.tenantName}
              onChange={handleChange}
              placeholder="Enter your organization name if you want to create one"
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p>
            Already have an account?{' '}
            <Link to="/" className="text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
