import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Camera, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INTERESTS = [
  'Dancing', 'Music', 'Travel', 'Food & Wine', 'Photography', 
  'Art', 'Sports', 'Reading', 'Movies', 'Fitness', 
  'Cooking', 'Nature', 'Gaming', 'Fashion', 'Tech'
];

const RELATIONSHIPS = [
  "Friend of Bride", "Friend of Groom", "Family of Bride", 
  "Family of Groom", "Colleague", "Plus One"
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    photo_url: user?.photo_url || '',
    age: user?.age || '',
    gender: user?.gender || '',
    looking_for: user?.looking_for || '',
    bio: user?.bio || '',
    interests: user?.interests || [],
    relationship_to_couple: user?.relationship_to_couple || '',
    fun_fact: user?.fun_fact || ''
  });

  const toggleInterest = (interest) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 5 
          ? [...prev.interests, interest]
          : prev.interests
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For demo, using a placeholder. In production, upload to storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, photo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!profile.age || !profile.gender || !profile.looking_for) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const res = await axios.put(`${API}/profile`, {
        ...profile,
        age: parseInt(profile.age)
      });
      updateUser(res.data.user);
      toast.success('Profile complete! Start discovering matches.');
      navigate('/discover');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="font-serif text-2xl text-charcoal">Your Photo</h2>
              <p className="text-muted-foreground">Add a photo so others can recognize you</p>
            </div>

            {/* Photo Upload */}
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <div className="w-40 h-40 rounded-full border-4 border-dashed border-sage/30 flex items-center justify-center overflow-hidden bg-muted/30 transition-colors group-hover:border-sage/50">
                  {profile.photo_url ? (
                    <img 
                      src={profile.photo_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-sage/50" />
                  )}
                </div>
                <div className="absolute bottom-2 right-2 w-10 h-10 bg-sage rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  className="hidden"
                  data-testid="photo-upload"
                />
              </label>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-charcoal">Age *</Label>
                <Input
                  type="number"
                  placeholder="Your age"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="h-12 bg-white/80"
                  min={18}
                  max={100}
                  required
                  data-testid="age-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-charcoal">I am *</Label>
                <Select 
                  value={profile.gender} 
                  onValueChange={(val) => setProfile({ ...profile, gender: val })}
                >
                  <SelectTrigger className="h-12 bg-white/80" data-testid="gender-select">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-charcoal">Looking for *</Label>
                <Select 
                  value={profile.looking_for} 
                  onValueChange={(val) => setProfile({ ...profile, looking_for: val })}
                >
                  <SelectTrigger className="h-12 bg-white/80" data-testid="looking-for-select">
                    <SelectValue placeholder="Interested in" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="men">Men</SelectItem>
                    <SelectItem value="women">Women</SelectItem>
                    <SelectItem value="everyone">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="font-serif text-2xl text-charcoal">About You</h2>
              <p className="text-muted-foreground">Help others get to know you better</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-charcoal">Bio</Label>
                <Textarea
                  placeholder="A little about yourself..."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="bg-white/80 min-h-[100px] resize-none"
                  maxLength={200}
                  data-testid="bio-input"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {profile.bio.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-charcoal">How do you know the couple?</Label>
                <Select 
                  value={profile.relationship_to_couple} 
                  onValueChange={(val) => setProfile({ ...profile, relationship_to_couple: val })}
                >
                  <SelectTrigger className="h-12 bg-white/80" data-testid="relationship-select">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map(rel => (
                      <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-charcoal">Fun fact about you</Label>
                <Input
                  placeholder="e.g., I can juggle 5 balls"
                  value={profile.fun_fact}
                  onChange={(e) => setProfile({ ...profile, fun_fact: e.target.value })}
                  className="h-12 bg-white/80"
                  maxLength={100}
                  data-testid="fun-fact-input"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="font-serif text-2xl text-charcoal">Your Interests</h2>
              <p className="text-muted-foreground">Select up to 5 interests</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {INTERESTS.map(interest => (
                <Badge
                  key={interest}
                  variant={profile.interests.includes(interest) ? 'default' : 'outline'}
                  className={`
                    cursor-pointer px-4 py-2 text-sm transition-all
                    ${profile.interests.includes(interest) 
                      ? 'bg-sage text-white hover:bg-sage/90' 
                      : 'bg-white/80 text-charcoal hover:bg-sage/10 border-border'
                    }
                  `}
                  onClick={() => toggleInterest(interest)}
                  data-testid={`interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {interest}
                </Badge>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {profile.interests.length}/5 selected
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-bone relative" data-testid="profile-setup-page">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose fill-rose" />
          <span className="font-serif text-xl text-charcoal">Setup</span>
        </div>
        <span className="text-sm text-muted-foreground">Step {step}/3</span>
      </header>

      {/* Progress Bar */}
      <div className="px-6">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-sage transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <main className="p-6 pb-32">
        {renderStep()}
      </main>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-bone via-bone to-transparent">
        <div className="max-w-md mx-auto flex gap-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              className="flex-1 h-12 rounded-xl border-border bg-white/80"
              data-testid="back-step-btn"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 h-12 rounded-xl bg-sage hover:bg-sage/90 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              data-testid="next-step-btn"
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl bg-rose hover:bg-rose/90 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              data-testid="complete-profile-btn"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Find My Match
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
