import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, Sparkles, Copy, Calendar, MapPin, LogOut, Plus } from 'lucide-react';
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
      toast.success('Event created! Share the code with your guests.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create event');
    } finally {
      setIsCreating(false);
    }
  };

  const copyEventCode = () => {
    if (event?.code) {
      navigator.clipboard.writeText(event.code);
      toast.success('Event code copied!');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-border sticky top-0 z-20">
        <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose fill-rose" />
            <span className="font-serif text-xl text-charcoal">Host Dashboard</span>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-charcoal"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {event ? (
          <>
            {/* Event Info Card */}
            <Card className="bg-white shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif text-2xl text-charcoal">
                  {event.bride_name} & {event.groom_name}'s Wedding
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                <div className="bg-sage/10 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-2">Share this code with your guests</p>
                  <div className="flex items-center gap-3">
                    <div className="bg-white rounded-lg px-6 py-3 font-mono text-2xl tracking-[0.3em] text-charcoal border border-border">
                      {event.code}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyEventCode}
                      className="border-sage/30 text-sage"
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
              <Card className="bg-white shadow-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-sage/10 rounded-full flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-sage" />
                  </div>
                  <p className="text-3xl font-serif text-charcoal">{stats.guests}</p>
                  <p className="text-sm text-muted-foreground">Single Guests</p>
                </CardContent>
              </Card>
              
              <Card className="bg-white shadow-card">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto bg-rose/10 rounded-full flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-rose" />
                  </div>
                  <p className="text-3xl font-serif text-charcoal">{stats.matches}</p>
                  <p className="text-sm text-muted-foreground">Matches Made</p>
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            <Card className="bg-accent/20 border-accent/30">
              <CardContent className="p-4">
                <h3 className="font-serif text-lg text-charcoal mb-2">Tips for Your Guests</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Share the event code on your wedding invitations</li>
                  <li>• Encourage guests to complete their profiles before the event</li>
                  <li>• Mention the app during the reception!</li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          /* No Event - Create One */
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto bg-rose/10 rounded-full flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-rose" />
            </div>
            <h2 className="font-serif text-2xl text-charcoal mb-2">Create Your Wedding Event</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Set up your event and get a unique code to share with your single guests.
            </p>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-sage hover:bg-sage/90" data-testid="create-event-btn">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-bone border-border">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl text-charcoal">
                    Wedding Details
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-charcoal">Bride's Name *</Label>
                      <Input
                        value={eventForm.bride_name}
                        onChange={(e) => setEventForm({ ...eventForm, bride_name: e.target.value })}
                        placeholder="Sarah"
                        className="bg-white/80"
                        required
                        data-testid="bride-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-charcoal">Groom's Name *</Label>
                      <Input
                        value={eventForm.groom_name}
                        onChange={(e) => setEventForm({ ...eventForm, groom_name: e.target.value })}
                        placeholder="Michael"
                        className="bg-white/80"
                        required
                        data-testid="groom-name-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-charcoal">Wedding Date *</Label>
                    <Input
                      type="date"
                      value={eventForm.wedding_date}
                      onChange={(e) => setEventForm({ ...eventForm, wedding_date: e.target.value })}
                      className="bg-white/80"
                      required
                      data-testid="wedding-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-charcoal">Venue (Optional)</Label>
                    <Input
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                      placeholder="The Grand Ballroom"
                      className="bg-white/80"
                      data-testid="venue-input"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isCreating}
                    className="w-full bg-sage hover:bg-sage/90 h-12"
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
