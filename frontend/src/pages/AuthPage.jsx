import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  // Form states
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    const hostSignup = localStorage.getItem('isHostSignup');
    if (hostSignup) {
      setIsHost(true);
      setActiveTab('register');
      localStorage.removeItem('isHostSignup');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      toast.success(`Welcome back, ${user.name}!`);
      
      // Check for pending event code
      const pendingCode = localStorage.getItem('pendingEventCode');
      if (pendingCode) {
        try {
          const res = await axios.post(`${API}/events/join`, { event_code: pendingCode });
          updateUser({ event_id: res.data.event.id });
          localStorage.removeItem('pendingEventCode');
          navigate(user.profile_complete ? '/discover' : '/profile-setup');
        } catch (err) {
          toast.error('Invalid event code');
          navigate('/');
        }
      } else if (user.is_host) {
        navigate('/admin');
      } else if (user.event_id && user.profile_complete) {
        navigate('/discover');
      } else if (user.event_id) {
        navigate('/profile-setup');
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await register(
        registerForm.email, 
        registerForm.password, 
        registerForm.name,
        isHost
      );
      toast.success('Account created!');
      
      if (isHost) {
        navigate('/admin');
      } else {
        const pendingCode = localStorage.getItem('pendingEventCode');
        if (pendingCode) {
          try {
            const res = await axios.post(`${API}/events/join`, { event_code: pendingCode });
            updateUser({ event_id: res.data.event.id });
            localStorage.removeItem('pendingEventCode');
          } catch (err) {
            toast.error('Invalid event code');
          }
        }
        navigate('/profile-setup');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-container min-h-screen relative" data-testid="auth-page">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1766113479053-4d8f647ac259?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwdGFibGUlMjBzZXR0aW5nJTIwZmxvd2VycyUyMGVsZWdhbnR8ZW58MHx8fHwxNzY5Nzk3NzA4fDA&ixlib=rb-4.1.0&q=85"
          alt="Wedding ambiance"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-bone/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-charcoal hover:text-sage -ml-2"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-6 pb-12">
          <div className="space-y-8">
            {/* Logo */}
            <div className="text-center space-y-2">
              <Heart className="w-12 h-12 mx-auto text-rose fill-rose" />
              <h1 className="font-serif text-3xl text-charcoal">
                {isHost ? 'Host Dashboard' : 'Welcome'}
              </h1>
              <p className="text-muted-foreground">
                {isHost ? 'Create and manage your wedding event' : 'Sign in to find your match'}
              </p>
            </div>

            {/* Auth Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-xl p-1 h-12">
                <TabsTrigger 
                  value="login" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-charcoal font-serif"
                  data-testid="login-tab"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-charcoal font-serif"
                  data-testid="register-tab"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-charcoal">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="pl-10 h-12 bg-white/80 border-border"
                        required
                        data-testid="login-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-charcoal">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="pl-10 h-12 bg-white/80 border-border"
                        required
                        data-testid="login-password"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-sage hover:bg-sage/90 h-12 rounded-xl font-serif text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    data-testid="login-submit"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Form */}
              <TabsContent value="register" className="mt-6">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-charcoal">Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className="pl-10 h-12 bg-white/80 border-border"
                        required
                        data-testid="register-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-charcoal">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="pl-10 h-12 bg-white/80 border-border"
                        required
                        data-testid="register-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-charcoal">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="pl-10 h-12 bg-white/80 border-border"
                        required
                        minLength={6}
                        data-testid="register-password"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="isHost" 
                      checked={isHost}
                      onCheckedChange={setIsHost}
                      data-testid="host-checkbox"
                    />
                    <Label 
                      htmlFor="isHost" 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      I'm hosting a wedding (Bride/Groom)
                    </Label>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-sage hover:bg-sage/90 h-12 rounded-xl font-serif text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    data-testid="register-submit"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
