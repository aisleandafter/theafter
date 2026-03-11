import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Copy, Calendar, MapPin, LogOut, Plus, CreditCard, Check, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, updateUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ guests: 0, matches: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [eventPrice, setEventPrice] = useState(49.99);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [liveStats, setLiveStats] = useState(null);
  const [isWeddingDay, setIsWeddingDay] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  
  const [eventForm, setEventForm] = useState({
    bride_name: '',
    groom_name: '',
    wedding_date: '',
    venue: ''
  });

  useEffect(() => {
    fetchEventData();
    checkPaymentStatus();
    fetchLiveStats();
    checkWeddingDay();
    
    // Check if returning from Stripe
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const fetchLiveStats = async () => {
    try {
      const res = await axios.get(`${API}/events/live-stats`);
      setLiveStats(res.data);
    } catch (err) {
      console.error('Failed to fetch live stats:', err);
    }
  };

  const checkWeddingDay = async () => {
    try {
      const res = await axios.get(`${API}/events/wedding-day-mode`);
      setIsWeddingDay(res.data.is_wedding_day);
    } catch (err) {
      console.error('Failed to check wedding day:', err);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const res = await axios.get(`${API}/payments/check`);
      setHasPaid(res.data.has_paid);
      setEventPrice(res.data.price);
    } catch (err) {
      console.error('Failed to check payment status:', err);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      toast.error('Payment verification timed out. Please refresh the page.');
      setIsProcessingPayment(false);
      return;
    }

    setIsProcessingPayment(true);

    try {
      const res = await axios.get(`${API}/payments/status/${sessionId}`);
      
      if (res.data.payment_status === 'paid') {
        setHasPaid(true);
        setPaymentSuccess(true);
        setIsProcessingPayment(false);
        toast.success('Payment successful! You can now create your event.');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      } else if (res.data.status === 'expired') {
        toast.error('Payment session expired. Please try again.');
        setIsProcessingPayment(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (err) {
      console.error('Error checking payment:', err);
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    }
  };

  const fetchEventData = async () => {
    try {
      const eventRes = await axios.get(`${API}/events/current`);
      if (eventRes.data.event) {
        setEvent(eventRes.data.event);
        
        const statsRes = await axios.get(`${API}/events/${eventRes.data.event.id}/stats`);
        setStats({
          guests: statsRes.data.guests,
          matches: statsRes.data.matches
        });
      }
    } catch (err) {
      console.error('Failed to fetch event data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await axios.post(`${API}/promo/validate`, { code: promoCode });
      setPromoResult(res.data);
      toast.success(`${res.data.description} applied!`);
    } catch (err) {
      setPromoResult(null);
      toast.error('Invalid promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await axios.post(`${API}/payments/checkout`, {
        origin_url: window.location.origin,
        promo_code: promoResult?.code || null
      });
      
      // If 100% discount, payment is instant
      if (res.data.paid_free) {
        setHasPaid(true);
        setPaymentSuccess(true);
        setIsProcessingPayment(false);
        toast.success('Promo code applied! You can now create your event.');
        return;
      }
      
      // Open Stripe Checkout in new tab to avoid proxy/iframe issues
      const stripeWindow = window.open(res.data.checkout_url, '_blank');
      if (!stripeWindow) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to initiate payment');
      setIsProcessingPayment(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    if (!eventForm.bride_name || !eventForm.groom_name || !eventForm.wedding_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const res = await axios.post(`${API}/events/create`, eventForm);
      setEvent(res.data.event);
      updateUser({ event_id: res.data.event.id });
      setShowCreateDialog(false);
      toast.success('Event created. Share the code with your guests.');
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error('Please complete payment first');
        setHasPaid(false);
      } else {
        toast.error(err.response?.data?.detail || 'Failed to create event');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const copyEventCode = () => {
    if (event?.code) {
      navigator.clipboard.writeText(event.code);
      toast.success('Event code copied');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mobile-container min-h-screen bg-white noise-bg" data-testid="admin-dashboard">
      {/* Header */}
      <header className="p-4 flex justify-between items-center sticky top-0 glass-header z-20">
        <img src={LOGO_URL} alt="aisle & after" className="h-10" />
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground font-sans text-sm tracking-wide"
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </header>

      <main className="p-6 space-y-8">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl text-foreground tracking-tight">Host Dashboard</h1>
          <p className="font-sans text-sm text-muted-foreground">Manage your wedding matching experience</p>
        </div>

        {/* Processing Payment Overlay */}
        {isProcessingPayment && (
          <div className="card-modern p-8 text-center">
            <div className="w-12 h-12 mx-auto border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mb-4" />
            <h3 className="font-serif text-lg text-foreground mb-2">Verifying Payment...</h3>
            <p className="font-sans text-muted-foreground text-sm">Please wait while we confirm your payment</p>
          </div>
        )}

        {/* Payment Success Message */}
        {paymentSuccess && !event && (
          <div className="card-modern p-6 flex items-center gap-4 border-green-200 bg-green-50/50">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-green-800">Payment Successful!</h3>
              <p className="font-sans text-green-700 text-sm">You can now create your wedding event below.</p>
            </div>
          </div>
        )}

        {event ? (
          <>
            {/* Event Info Card */}
            <div className="card-modern p-6 space-y-6">
              <h2 className="font-serif text-2xl text-foreground tracking-tight">
                {event.bride_name} & {event.groom_name}
              </h2>
              <div className="flex flex-wrap gap-6 font-sans text-sm text-muted-foreground">
                {event.wedding_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(event.wedding_date), 'MMMM d, yyyy')}
                  </div>
                )}
                {event.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {event.venue}
                  </div>
                )}
              </div>

              {/* Event Code */}
              <div className="bg-muted/30 p-6 rounded-xl">
                <p className="font-sans text-xs text-muted-foreground tracking-[0.15em] uppercase mb-3">Event Code</p>
                <div className="flex items-center gap-4">
                  <div className="bg-white px-8 py-4 text-3xl tracking-[0.4em] text-foreground border border-border/30 font-mono rounded-xl">
                    {event.code}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyEventCode}
                    className="rounded-full font-sans btn-pill"
                    data-testid="copy-code-btn"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/countdown/${event.code}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Countdown link copied!');
                  }}
                  className="font-sans text-xs text-muted-foreground hover:text-foreground underline mt-3 block"
                  data-testid="share-countdown-btn"
                >
                  Copy shareable countdown link
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card-modern p-6 text-center">
                <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-foreground/70" />
                </div>
                <p className="font-serif text-4xl text-foreground tracking-tight">{stats.guests}</p>
                <p className="font-sans text-xs text-muted-foreground tracking-wide uppercase mt-1">Single Guests</p>
              </div>
              
              <div className="card-modern p-6 text-center">
                <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-foreground/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </div>
                <p className="font-serif text-4xl text-foreground tracking-tight">{stats.matches}</p>
                <p className="font-sans text-xs text-muted-foreground tracking-wide uppercase mt-1">Matches Made</p>
              </div>
            </div>

            {/* Wedding Day Banner */}
            {isWeddingDay && (
              <div className="card-modern p-5 bg-foreground text-white" data-testid="admin-wedding-day-banner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center wedding-day-pulse">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif text-lg tracking-tight">It's the big day!</p>
                    <p className="font-sans text-xs text-white/70">Wedding Day Mode is active for your guests</p>
                  </div>
                </div>
              </div>
            )}

            {/* Live Activity Stats */}
            {liveStats && (
              <div className="card-modern p-6" data-testid="admin-live-stats">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-foreground/70" />
                  <h3 className="font-serif text-lg text-foreground tracking-tight">Live Activity</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="font-serif text-2xl text-foreground">{liveStats.total_guests}</p>
                    <p className="font-sans text-xs text-muted-foreground">Guests</p>
                  </div>
                  <div className="text-center">
                    <p className="font-serif text-2xl text-foreground">{liveStats.total_matches}</p>
                    <p className="font-sans text-xs text-muted-foreground">Matches</p>
                  </div>
                  <div className="text-center">
                    <p className="font-serif text-2xl text-foreground">{liveStats.today_matches}</p>
                    <p className="font-sans text-xs text-muted-foreground">Today</p>
                  </div>
                </div>
                {liveStats.recent_match_names?.length > 0 && (
                  <div className="border-t border-border/30 pt-4">
                    <p className="font-sans text-xs text-muted-foreground tracking-wide uppercase mb-2">Recent Matches</p>
                    <div className="space-y-1">
                      {liveStats.recent_match_names.map((name, i) => (
                        <p key={i} className="font-sans text-sm text-foreground">
                          <Sparkles className="w-3 h-3 inline mr-2 text-muted-foreground" />
                          {name}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tips */}
            <div className="card-modern p-6 bg-muted/20">
              <h3 className="font-serif text-lg text-foreground mb-4 tracking-tight">How to Use</h3>
              <ul className="font-sans text-sm text-muted-foreground space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-foreground text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                  Share the event code on your wedding invitations
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-foreground text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                  Encourage guests to complete their profiles before the event
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 bg-foreground text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                  Announce the app during the reception
                </li>
              </ul>
            </div>
          </>
        ) : !isProcessingPayment && (
          /* No Event - Payment or Create */
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-8">
              <svg className="w-8 h-8 text-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl text-foreground mb-2 tracking-tight">Create your Wedding</h2>
            <p className="font-sans text-sm text-muted-foreground mb-8">Where you become the matchmaker</p>
            
            {!hasPaid ? (
              /* Payment Required */
              <div className="space-y-4">
                <div className="card-modern max-w-sm mx-auto p-6">
                  <div className="text-center mb-6">
                    <p className="font-serif text-4xl text-foreground tracking-tight">${eventPrice}</p>
                    <p className="font-sans text-sm text-muted-foreground mt-1">One-time payment</p>
                  </div>
                  <ul className="font-sans text-sm text-muted-foreground space-y-3 text-left mb-6">
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                      Unique event code
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                      Unlimited guests
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                      AI conversation starters
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-foreground flex-shrink-0" />
                      Match analytics
                    </li>
                  </ul>
                  {/* Promo Code */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <Input
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoResult(null); }}
                        placeholder="Promo code"
                        className="flex-1 bg-white border-border/30 rounded-xl font-sans text-sm placeholder:text-xs"
                        data-testid="promo-input"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={validatePromoCode}
                        disabled={!promoCode.trim() || promoLoading}
                        className="rounded-xl font-sans text-xs"
                        data-testid="apply-promo-btn"
                      >
                        {promoLoading ? '...' : 'Apply'}
                      </Button>
                    </div>
                    {promoResult && (
                      <div className="mt-2 p-2 bg-green-50 rounded-lg flex items-center justify-between">
                        <span className="font-sans text-xs text-green-700">
                          <Check className="w-3 h-3 inline mr-1" />
                          {promoResult.description}
                        </span>
                        <span className="font-sans text-xs text-green-800 font-medium">
                          {promoResult.final_price > 0 ? `$${promoResult.final_price}` : 'FREE'}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handlePayment}
                    disabled={isProcessingPayment}
                    className="w-full bg-foreground hover:bg-foreground/90 rounded-full h-12 btn-pill"
                    data-testid="pay-btn"
                  >
                    {isProcessingPayment ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {promoResult 
                          ? promoResult.final_price > 0 
                            ? `Pay $${promoResult.final_price}` 
                            : 'Claim Free Event'
                          : `Pay $${eventPrice}`
                        }
                      </>
                    )}
                  </Button>
                  {isProcessingPayment && (
                    <p className="font-sans text-xs text-muted-foreground mt-4 text-center">
                      A payment window has opened. Complete payment there, then return here.
                      <button 
                        onClick={() => { setIsProcessingPayment(false); checkPaymentStatus(); }} 
                        className="block mx-auto mt-2 underline hover:text-foreground"
                        data-testid="verify-payment-btn"
                      >
                        I've completed payment
                      </button>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Can Create Event */
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-foreground hover:bg-foreground/90 rounded-full btn-pill h-12 px-8" data-testid="create-event-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-border/30 rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-2xl text-foreground tracking-tight">
                      Wedding Details
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateEvent} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-sans text-foreground text-sm tracking-wide">Bride's Name *</Label>
                        <Input
                          value={eventForm.bride_name}
                          onChange={(e) => setEventForm({ ...eventForm, bride_name: e.target.value })}
                          placeholder="Sarah"
                          className="bg-white border-border/30 rounded-xl font-sans placeholder:text-xs"
                          required
                          data-testid="bride-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-sans text-foreground text-sm tracking-wide">Groom's Name *</Label>
                        <Input
                          value={eventForm.groom_name}
                          onChange={(e) => setEventForm({ ...eventForm, groom_name: e.target.value })}
                          placeholder="Michael"
                          className="bg-white border-border/30 rounded-xl font-sans placeholder:text-xs"
                          required
                          data-testid="groom-name-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-sans text-foreground text-sm tracking-wide">Wedding Date *</Label>
                      <Input
                        type="date"
                        value={eventForm.wedding_date}
                        onChange={(e) => setEventForm({ ...eventForm, wedding_date: e.target.value })}
                        className="bg-white border-border/30 rounded-xl font-sans"
                        required
                        data-testid="wedding-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-sans text-foreground text-sm tracking-wide">Venue (Optional)</Label>
                      <Input
                        value={eventForm.venue}
                        onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                        placeholder="The Grand Ballroom"
                        className="bg-white border-border/30 rounded-xl font-sans placeholder:text-xs"
                        data-testid="venue-input"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isCreating}
                      className="w-full bg-foreground hover:bg-foreground/90 h-12 rounded-full btn-pill"
                      data-testid="submit-event-btn"
                    >
                      {isCreating ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Create Event'
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
