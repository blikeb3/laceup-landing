import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, Shield, LogOut, Briefcase, Users, Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { UserSearchBar } from "@/components/UserSearchBar";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { useNotifications } from "@/hooks/useNotifications";

export const Navigation = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<{ first_name?: string | null; last_name?: string | null; avatar_url?: string | null } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unreadCount } = useNotifications();

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (userId: string) => {
      if (!mounted) return;

      const [roleData, profileData] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).limit(1),
        supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", userId).single()
      ]);

      if (mounted) {
        const role = roleData.data?.[0]?.role ?? null;
        setIsAdmin(role === "admin");
        setUserProfile(profileData.data);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session?.user) {
          loadUserData(session.user.id);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          if (session?.user) {
            loadUserData(session.user.id);
          } else {
            setIsAdmin(false);
            setUserProfile(null);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      navigate("/auth");
    }
  };

  const userInitials = `${userProfile?.first_name?.charAt(0) || ''}${userProfile?.last_name?.charAt(0) || ''}`.toUpperCase() || "U";

  if (location.pathname === "/auth") {
    return null;
  }

  const Avatar = ({ imageUrl }: { imageUrl?: string | null }) => (
    imageUrl ? (
      <img src={imageUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
    ) : (
      <span>{userInitials}</span>
    )
  );

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <NavLink
        to="/home"
        end
        className={`${mobile ? 'block w-full' : ''} px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all`}
        activeClassName="bg-white/10 text-white"
      >
        Home
      </NavLink>
      <NavLink
        to="/opportunities"
        className={`${mobile ? 'block w-full' : ''} px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all`}
        activeClassName="bg-white/10 text-white"
      >
        Opportunities
      </NavLink>
      <NavLink
        to="/my-hub"
        className={`${mobile ? 'block w-full' : ''} px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all flex items-center gap-1`}
        activeClassName="bg-white/10 text-white"
      >
        <Users className="h-4 w-4" />
        Network
      </NavLink>
      <NavLink
        to="/lace-hub"
        className={`${mobile ? 'block w-full' : ''} px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all flex items-center gap-1`}
        activeClassName="bg-white/10 text-white"
      >
        <Briefcase className="h-4 w-4" />
        LaceHub
      </NavLink>
      <NavLink
        to="/messages"
        className={`${mobile ? 'block w-full' : ''} px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all flex items-center gap-1`}
        activeClassName="bg-white/10 text-white"
      >
        <MessageSquare className="h-4 w-4" />
        Messages
      </NavLink>
      <NavLink
        to="/notifications"
        className={`${mobile ? 'block w-full' : ''} px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all flex items-center gap-1 relative`}
        activeClassName="bg-white/10 text-white"
      >
        <div className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        Notifications
      </NavLink>
      {isAdmin && (
        <NavLink
          to="/admin"
          className={`${mobile ? 'block w-full' : ''} px-4 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-all flex items-center gap-1`}
          activeClassName="bg-white/10 text-white"
        >
          <Shield className="h-4 w-4" />
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-navy to-navy-light text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Logo and Search Bar */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link to="/home" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
              <img src="/Logo_No_Background.svg" alt="LaceUP" className="h-10 w-auto" />
              <span className="text-2xl font-heading font-bold text-gold">LaceUP</span>
            </Link>
            {/* Search Bar - Desktop */}
            <div className="hidden xl:block">
              <UserSearchBar />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center space-x-1 gap-1 flex-shrink-0">
            <NavLinks />

            {/* Notifications */}
            <NotificationsDropdown />

            {/* Avatar */}
            <Link to="/profile" className="ml-2 w-9 h-9 rounded-full bg-gold text-navy flex items-center justify-center font-semibold text-sm hover:opacity-80 transition-opacity overflow-hidden">
              <Avatar imageUrl={userProfile?.avatar_url} />
            </Link>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="ml-2 text-white/90 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex xl:hidden items-center space-x-2">
            <Link to="/profile" className="w-8 h-8 rounded-full bg-gold text-navy flex items-center justify-center font-semibold text-xs overflow-hidden">
              <Avatar imageUrl={userProfile?.avatar_url} />
            </Link>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 bg-navy border-navy-light p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-white/10 flex items-center gap-2">
                    <img src="/Logo_No_Background.svg" alt="LaceUP" className="h-8 w-auto" />
                    <span className="text-lg font-heading font-bold text-gold">LaceUP</span>
                  </div>
                  <div className="p-4 border-b border-white/10">
                    <UserSearchBar className="w-full" />
                  </div>
                  <div className="flex-1 p-4 space-y-2">
                    <NavLinks mobile />
                  </div>
                  <div className="p-4 border-t border-white/10 space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="w-full justify-start text-white/90 hover:bg-white/10 hover:text-white"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};