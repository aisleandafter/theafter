import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

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
      toast.success(`Welcome back, ${user.name}`);
      
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
      toast.success('Account created');
      
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
    <div className="mobile-container min-h-screen relative noise-bg" data-testid="auth-page">
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-foreground/70 hover:text-foreground -ml-2 font-sans text-sm"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center px-8 pb-12">
          <div className="space-y-10 animate-fade-up">
            {/* Logo */}
            <div className="space-y-6">
              <img src={LOGO_URL} alt="aisle & after" className="h-16" />
              <div className="space-y-1">
                <h1 className="font-serif text-3xl text-foreground tracking-tight">
                  {isHost ? 'Host Dashboard' : 'Welcome'}
                </h1>
                <p className="font-sans text-sm text-muted-foreground">
                  {isHost ? 'Create and manage your wedding event' : 'Sign in to meet the guests'}
                </p>
              </div>
            </div>

            {/* Auth Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-full p-1 h-12">
                <TabsTrigger 
                  value="login" 
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:text-foreground font-sans text-sm data-[state=active]:shadow-soft"
                  data-testid="login-tab"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="rounded-full data-[state=active]:bg-white data-[state=active]:text-foreground font-sans text-sm data-[state=active]:shadow-soft"
                  data-testid="register-tab"
                >
                  Register
                </TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login" className="mt-8">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="input-underline pl-6 h-12 font-sans placeholder:text-xs"
                        required
                        data-testid="login-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="input-underline pl-6 h-12 font-sans placeholder:text-xs"
                        required
                        data-testid="login-password"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-foreground hover:bg-foreground/90 h-12 rounded-full font-sans text-sm tracking-wide btn-pill"
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
              <TabsContent value="register" className="mt-8">
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Name</Label>
                    <div className="relative">
                      <User className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        type="text"
                        placeholder="Your name"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        className="input-underline pl-6 h-12 font-sans placeholder:text-xs"
                        required
                        data-testid="register-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        className="input-underline pl-6 h-12 font-sans placeholder:text-xs"
                        required
                        data-testid="register-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="input-underline pl-6 h-12 font-sans placeholder:text-xs"
                        required
                        minLength={6}
                        data-testid="register-password"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="isHost" 
                      checked={isHost}
                      onCheckedChange={setIsHost}
                      className="rounded-sm"
                      data-testid="host-checkbox"
                    />
                    <Label 
                      htmlFor="isHost" 
                      className="text-sm text-muted-foreground cursor-pointer font-sans"
                    >
                      I'm hosting a wedding
                    </Label>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-foreground hover:bg-foreground/90 h-12 rounded-full font-sans text-sm tracking-wide btn-pill"
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
