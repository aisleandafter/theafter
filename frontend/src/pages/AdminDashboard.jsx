import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Copy, Calendar, MapPin, LogOut, Plus } from 'lucide-react';
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
  const { user, logout, updateUser } = useAuth();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ guests: 0, matches: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [eventForm, setEventForm] = useState({
    bride_name: '',
    groom_name: '',
    wedding_date: '',
    venue: ''
  });

  useEffect(() => {
    fetchEventData();
  }, []);

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
      toast.error(err.response?.data?.detail || 'Failed to create event');
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
        <div className="w-8 h-8 border border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur border-b border-border/50 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
          <img src={LOGO_URL} alt="aisle & after" className="h-12" />
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground text-sm tracking-wide"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl text-foreground tracking-tight">Host Dashboard</h1>
          <p className="text-muted-foreground">Manage your wedding matching experience</p>
        </div>

        {event ? (
          <>
            {/* Event Info Card */}
            <Card className="bg-white border-border/50 shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-foreground tracking-tight">
                  {event.bride_name} & {event.groom_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
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
                <div className="bg-muted/20 p-6">
                  <p className="text-xs text-muted-foreground tracking-wide uppercase mb-3">Event Code</p>
                  <div className="flex items-center gap-4">
                    <div className="bg-white px-8 py-4 text-3xl tracking-[0.4em] text-foreground border border-border/50 font-mono">
                      {event.code}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyEventCode}
                      className="border-border rounded-none"
                      data-testid="copy-code-btn"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white border-border/50 shadow-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto border border-border flex items-center justify-center mb-4">
                    <Users className="w-5 h-5 text-foreground/70" />
                  </div>
                  <p className="text-4xl text-foreground tracking-tight">{stats.guests}</p>
                  <p className="text-xs text-muted-foreground tracking-wide uppercase mt-1">Single Guests</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-border/50 shadow-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto border border-border flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-foreground/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                  <p className="text-4xl text-foreground tracking-tight">{stats.matches}</p>
                  <p className="text-xs text-muted-foreground tracking-wide uppercase mt-1">Matches Made</p>
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            <Card className="bg-muted/10 border-border/30">
              <CardContent className="p-6">
                <h3 className="text-lg text-foreground mb-4 tracking-tight">How to Use</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• Share the event code on your wedding invitations</li>
                  <li>• Encourage guests to complete their profiles before the event</li>
                  <li>• Announce the app during the reception</li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          /* No Event - Create One */
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto border border-border flex items-center justify-center mb-8">
              <svg className="w-8 h-8 text-foreground/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className="text-2xl text-foreground mb-2 tracking-tight">Create Your Wedding Event</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Set up your event and get a unique code to share with your single guests.
            </p>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-foreground hover:bg-foreground/90 rounded-none" data-testid="create-event-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-foreground tracking-tight">
                    Wedding Details
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm tracking-wide">Bride's Name *</Label>
                      <Input
                        value={eventForm.bride_name}
                        onChange={(e) => setEventForm({ ...eventForm, bride_name: e.target.value })}
                        placeholder="Sarah"
                        className="bg-white border-border/50 rounded-none"
                        required
                        data-testid="bride-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-sm tracking-wide">Groom's Name *</Label>
                      <Input
                        value={eventForm.groom_name}
                        onChange={(e) => setEventForm({ ...eventForm, groom_name: e.target.value })}
                        placeholder="Michael"
                        className="bg-white border-border/50 rounded-none"
                        required
                        data-testid="groom-name-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm tracking-wide">Wedding Date *</Label>
                    <Input
                      type="date"
                      value={eventForm.wedding_date}
                      onChange={(e) => setEventForm({ ...eventForm, wedding_date: e.target.value })}
                      className="bg-white border-border/50 rounded-none"
                      required
                      data-testid="wedding-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground text-sm tracking-wide">Venue (Optional)</Label>
                    <Input
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                      placeholder="The Grand Ballroom"
                      className="bg-white border-border/50 rounded-none"
                      data-testid="venue-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full bg-foreground hover:bg-foreground/90 h-12 rounded-none"
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
          </div>
        )}
      </main>
    </div>
  );
}
