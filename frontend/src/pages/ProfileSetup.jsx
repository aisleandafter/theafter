import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
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
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

const INTERESTS = [
  'Dancing late', 'Live music', 'Travel', 'Wine & cocktails', 'Photography', 
  'Art & culture', 'Sports', 'Books', 'Film', 'Wellness', 
  'Food & cooking', 'Outdoors', 'Games', 'Style', 'Tech'
];

const RELATIONSHIPS = [
  "Friend of Bride", "Friend of Groom", "Family of Bride", 
  "Family of Groom", "Colleague"
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfile(prev => ({ ...prev, photo_url: res.data.photo_url }));
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
    }
  };

  const getPhotoSrc = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const handleSubmit = async () => {
    if (!profile.age || !profile.looking_for) {
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
      toast.success('Profile complete');
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
          <div className="space-y-8 animate-fade-up">
            <div className="space-y-2">
              <h2 className="font-serif text-3xl text-foreground tracking-tight">Your Photo</h2>
              <p className="font-sans text-sm text-muted-foreground">Add a photo so guests can recognize you</p>
            </div>

            {/* Photo Upload */}
            <div className="flex justify-center py-4">
              <label className="relative cursor-pointer group">
                <div className="w-40 h-40 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 transition-all group-hover:border-foreground/30">
                  {isUploading ? (
                    <Loader2 className="w-10 h-10 text-muted-foreground/50 animate-spin" />
                  ) : profile.photo_url ? (
                    <img 
                      src={getPhotoSrc(profile.photo_url)} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-muted-foreground/30" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-foreground rounded-full flex items-center justify-center shadow-medium">
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
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Age *</Label>
                <Input
                  type="number"
                  placeholder="Your age"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="input-underline h-12 font-sans placeholder:text-xs"
                  min={18}
                  max={100}
                  required
                  data-testid="age-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Interested in *</Label>
                <Select 
                  value={profile.looking_for} 
                  onValueChange={(val) => setProfile({ ...profile, looking_for: val })}
                >
                  <SelectTrigger className="h-12 bg-transparent border-0 border-b border-input rounded-none px-0 font-sans focus:ring-0" data-testid="looking-for-select">
                    <SelectValue placeholder="Select preference" />
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
          <div className="space-y-8 animate-fade-up">
            <div className="space-y-2">
              <h2 className="font-serif text-3xl text-foreground tracking-tight">About You</h2>
              <p className="font-sans text-sm text-muted-foreground">A few details to start a conversation</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">About you</Label>
                <Textarea
                  placeholder="A little about you: interests, energy, or what brings you here."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="bg-transparent border-0 border-b border-input rounded-none px-0 font-sans min-h-[100px] resize-none focus:ring-0 placeholder:text-xs"
                  maxLength={200}
                  data-testid="bio-input"
                />
                <p className="text-xs text-muted-foreground text-right font-sans">
                  {profile.bio.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">How do you know the couple?</Label>
                <Select 
                  value={profile.relationship_to_couple} 
                  onValueChange={(val) => setProfile({ ...profile, relationship_to_couple: val })}
                >
                  <SelectTrigger className="h-12 bg-transparent border-0 border-b border-input rounded-none px-0 font-sans focus:ring-0" data-testid="relationship-select">
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
                <Label className="font-sans text-xs tracking-widest uppercase text-muted-foreground">Fun fact about you</Label>
                <Input
                  placeholder="Something people wouldn't guess about you"
                  value={profile.fun_fact}
                  onChange={(e) => setProfile({ ...profile, fun_fact: e.target.value })}
                  className="input-underline h-12 font-sans placeholder:text-xs"
                  maxLength={100}
                  data-testid="fun-fact-input"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-fade-up">
            <div className="space-y-2">
              <h2 className="font-serif text-3xl text-foreground tracking-tight">Your Interests</h2>
              <p className="font-sans text-sm text-muted-foreground">Select up to 5 interests</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  type="button"
                  className={`
                    px-4 py-2.5 rounded-full font-serif text-sm transition-all duration-200
                    ${profile.interests.includes(interest) 
                      ? 'bg-foreground text-white' 
                      : 'bg-muted/50 text-foreground hover:bg-muted'
                    }
                  `}
                  onClick={() => toggleInterest(interest)}
                  data-testid={`interest-${interest.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {interest}
                </button>
              ))}
            </div>

            <p className="text-center font-sans text-sm text-muted-foreground">
              {profile.interests.length}/5 selected
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-white relative noise-bg" data-testid="profile-setup-page">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <img src={LOGO_URL} alt="aisle & after" className="h-12" />
        <span className="font-sans text-sm text-muted-foreground">Step {step}/3</span>
      </header>

      {/* Progress Bar */}
      <div className="px-6">
        <div className="h-0.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-foreground transition-all duration-500 ease-apple"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <main className="p-8 pb-32">
        {renderStep()}
      </main>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-md mx-auto flex gap-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              className="flex-1 h-12 rounded-full font-sans"
              data-testid="back-step-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 h-12 rounded-full bg-foreground hover:bg-foreground/90 font-sans btn-pill"
              data-testid="next-step-btn"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 h-12 rounded-full bg-foreground hover:bg-foreground/90 font-sans btn-pill"
              data-testid="complete-profile-btn"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Meet the Guests'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
