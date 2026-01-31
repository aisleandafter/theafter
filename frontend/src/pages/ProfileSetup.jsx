import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, ArrowLeft } from 'lucide-react';
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
const LOGO_URL = "https://customer-assets.emergentagent.com/job_14cfd5a5-e530-4fa4-8620-3c90f05d18d5/artifacts/mw7crcio_logo.png";

const INTERESTS = [
  'Dancing', 'Music', 'Travel', 'Wine', 'Photography', 
  'Art', 'Sports', 'Reading', 'Cinema', 'Fitness', 
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
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl text-foreground tracking-tight">Your Photo</h2>
              <p className="text-muted-foreground text-sm">Add a photo so others can recognize you</p>
            </div>

            {/* Photo Upload */}
            <div className="flex justify-center">
              <label className="relative cursor-pointer group">
                <div className="w-36 h-36 border border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 transition-colors group-hover:border-foreground/30">
                  {profile.photo_url ? (
                    <img 
                      src={profile.photo_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-foreground flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
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
                <Label className="text-foreground text-sm tracking-wide">Age *</Label>
                <Input
                  type="number"
                  placeholder="Your age"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="h-12 bg-white border-border/50 focus:border-foreground rounded-none"
                  min={18}
                  max={100}
                  required
                  data-testid="age-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm tracking-wide">I am *</Label>
                <Select 
                  value={profile.gender} 
                  onValueChange={(val) => setProfile({ ...profile, gender: val })}
                >
                  <SelectTrigger className="h-12 bg-white border-border/50 rounded-none" data-testid="gender-select">
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
                <Label className="text-foreground text-sm tracking-wide">Interested in *</Label>
                <Select 
                  value={profile.looking_for} 
                  onValueChange={(val) => setProfile({ ...profile, looking_for: val })}
                >
                  <SelectTrigger className="h-12 bg-white border-border/50 rounded-none" data-testid="looking-for-select">
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
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl text-foreground tracking-tight">About You</h2>
              <p className="text-muted-foreground text-sm">Help others get to know you better</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-foreground text-sm tracking-wide">Bio</Label>
                <Textarea
                  placeholder="A little about yourself..."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="bg-white border-border/50 focus:border-foreground min-h-[100px] resize-none rounded-none"
                  maxLength={200}
                  data-testid="bio-input"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {profile.bio.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm tracking-wide">How do you know the couple?</Label>
                <Select 
                  value={profile.relationship_to_couple} 
                  onValueChange={(val) => setProfile({ ...profile, relationship_to_couple: val })}
                >
                  <SelectTrigger className="h-12 bg-white border-border/50 rounded-none" data-testid="relationship-select">
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
                <Label className="text-foreground text-sm tracking-wide">Fun fact about you</Label>
                <Input
                  placeholder="e.g., I can juggle 5 balls"
                  value={profile.fun_fact}
                  onChange={(e) => setProfile({ ...profile, fun_fact: e.target.value })}
                  className="h-12 bg-white border-border/50 focus:border-foreground rounded-none"
                  maxLength={100}
                  data-testid="fun-fact-input"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl text-foreground tracking-tight">Your Interests</h2>
              <p className="text-muted-foreground text-sm">Select up to 5 interests</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {INTERESTS.map(interest => (
                <Badge
                  key={interest}
                  variant="outline"
                  className={`
                    cursor-pointer px-4 py-2 text-xs tracking-wide uppercase transition-colors rounded-none
                    ${profile.interests.includes(interest) 
                      ? 'bg-foreground text-white border-foreground hover:bg-foreground/90' 
                      : 'bg-white text-foreground hover:bg-muted/50 border-border'
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
    <div className="mobile-container min-h-screen bg-white relative" data-testid="profile-setup-page">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <img src={LOGO_URL} alt="aisle & after" className="h-6" />
        <span className="text-sm text-muted-foreground tracking-wide">Step {step}/3</span>
      </header>

      {/* Progress Bar */}
      <div className="px-6">
        <div className="h-px bg-border">
          <div 
            className="h-full bg-foreground transition-all duration-300"
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
              className="flex-1 h-12 rounded-none border-border bg-white"
              data-testid="back-step-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 h-12 rounded-none bg-foreground hover:bg-foreground/90"
              data-testid="next-step-btn"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 h-12 rounded-none bg-foreground hover:bg-foreground/90"
              data-testid="complete-profile-btn"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Find My Match'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
