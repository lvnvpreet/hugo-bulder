import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // For development - simulate a successful login
      // In production, this would call the actual API
      const mockUser = {
        id: '1',
        name: 'Demo User',
        email: email || 'demo@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const mockToken = 'dev-token-' + Date.now()
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      login(mockUser, mockToken)
      toast.success('Login successful!')
      
      // Redirect to wizard or wherever the user was trying to go
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
      navigate(returnUrl || '/wizard')
      
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setEmail('demo@example.com')
    setPassword('demo123')
    // Trigger the login
    setTimeout(() => {
      const form = document.querySelector('form') as HTMLFormElement
      if (form) {
        form.requestSubmit()
      }
    }, 100)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to continue building websites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="demo@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleDemoLogin}
              disabled={isLoading}
            >
              Quick Demo Login
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              Click "Quick Demo Login" to test the website builder
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
