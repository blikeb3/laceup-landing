import { useState, useEffect, useRef, useMemo } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { notifyConnectionRequest } from "@/lib/notificationHelpers";

interface SearchResult {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    sport: string | null;
    university: string | null;
}

export const UserSearchBar = ({ className }: { className?: string }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
    const [connectedUsers, setConnectedUsers] = useState<Set<string>>(new Set());
    const [connectingUserIds, setConnectingUserIds] = useState<Set<string>>(new Set());
    const [currentUserName, setCurrentUserName] = useState("");
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const searchableResults = useMemo(
        () => results.filter((profile) => profile.id !== user?.id),
        [results, user?.id]
    );

    useEffect(() => {
        const fetchConnectionState = async () => {
            if (!user) return;

            const [{ data: profile }, { data: sentRequests }, { data: connections }] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("first_name, last_name")
                    .eq("id", user.id)
                    .single(),
                supabase
                    .from("connection_requests")
                    .select("receiver_id")
                    .eq("requester_id", user.id)
                    .eq("status", "pending"),
                supabase
                    .from("connections")
                    .select("connected_user_id")
                    .eq("user_id", user.id),
            ]);

            const firstName = profile?.first_name || "";
            const lastName = profile?.last_name || "";
            setCurrentUserName(`${firstName} ${lastName}`.trim());
            setPendingRequests(new Set((sentRequests || []).map((request) => request.receiver_id)));
            setConnectedUsers(new Set((connections || []).map((connection) => connection.connected_user_id)));
        };

        fetchConnectionState();
    }, [user?.id]);

    // Search for users when query changes
    useEffect(() => {
        const searchUsers = async () => {
            if (query.trim().length < 2) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            setIsLoading(true);
            try {
                const trimmedQuery = query.trim();
                const terms = trimmedQuery.split(/\s+/);
                const orFilters = terms
                    .flatMap((term) => [
                        `first_name.ilike.%${term}%`,
                        `last_name.ilike.%${term}%`,
                    ])
                    .join(",");

                // Query filtered rows server-side so results are not limited to an arbitrary slice.
                const { data, error } = await supabase
                    .from("profiles")
                    .select("id, first_name, last_name, avatar_url, sport, university")
                    .neq("approval_status", "rejected")
                    .or(orFilters)
                    .limit(50);

                if (error) {
                    console.error("Search error:", error);
                    setResults([]);
                } else {
                    const profiles = data || [];
                    
                    // Filter results based on matching logic
                    const filtered = profiles.filter((profile) => {
                        const firstName = (profile.first_name || "").toLowerCase();
                        const lastName = (profile.last_name || "").toLowerCase();
                        const fullName = `${firstName} ${lastName}`.toLowerCase();
                        
                        // Check if full name contains search term
                        if (fullName.includes(trimmedQuery.toLowerCase())) {
                            return true;
                        }
                        
                        // Check if all search terms match (in order or as substrings)
                        if (terms.length > 1) {
                            // Try to match: first word with first_name, second word with last_name
                            const firstTerm = terms[0].toLowerCase();
                            const secondTerm = terms.slice(1).join(' ').toLowerCase();
                            
                            if (firstName.includes(firstTerm) && lastName.includes(secondTerm)) {
                                return true;
                            }
                            
                            // Also check reverse (last_name followed by first_name)
                            const lastTerm = terms[terms.length - 1].toLowerCase();
                            const firstTerms = terms.slice(0, -1).join(' ').toLowerCase();
                            
                            if (firstName.includes(lastTerm) && lastName.includes(firstTerms)) {
                                return true;
                            }
                        }
                        
                        // Single term matching in either name
                        if (firstName.includes(trimmedQuery.toLowerCase()) || 
                            lastName.includes(trimmedQuery.toLowerCase())) {
                            return true;
                        }
                        
                        return false;
                    }).slice(0, 8);
                    
                    setResults(filtered);
                    setSelectedIndex(-1);
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Search error:", err);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounceTimer);
    }, [query]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                if (!isOpen || searchableResults.length === 0) return;
                e.preventDefault();
                setSelectedIndex(prev => (prev < searchableResults.length - 1 ? prev + 1 : prev));
                break;
            case "ArrowUp":
                if (!isOpen || searchableResults.length === 0) return;
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && searchableResults[selectedIndex]) {
                    handleSelectUser(searchableResults[selectedIndex]);
                } else if (searchableResults.length === 1) {
                    // If only one result, go directly to that user's profile
                    handleSelectUser(searchableResults[0]);
                } else if (query.trim().length >= 2) {
                    // Navigate to Network tab with search query
                    navigate(`/my-hub?search=${encodeURIComponent(query.trim())}`);
                    setQuery("");
                    setResults([]);
                    setIsOpen(false);
                    setSelectedIndex(-1);
                }
                break;
            case "Escape":
                setIsOpen(false);
                setSelectedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    const handleSelectUser = (selectedUser: SearchResult) => {
        if (selectedUser.id === user?.id) {
            navigate("/profile");
        } else {
            navigate(`/profile/${selectedUser.id}`);
        }
        setQuery("");
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const handleConnect = async (targetUser: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        if (!user || targetUser.id === user.id) return;
        if (pendingRequests.has(targetUser.id) || connectedUsers.has(targetUser.id)) return;

        setConnectingUserIds((prev) => new Set(prev).add(targetUser.id));

        try {
            const { data: existingRequest } = await supabase
                .from("connection_requests")
                .select("id")
                .eq("requester_id", user.id)
                .eq("receiver_id", targetUser.id)
                .eq("status", "pending")
                .maybeSingle();

            if (existingRequest) {
                setPendingRequests((prev) => new Set(prev).add(targetUser.id));
                return;
            }

            const { error } = await supabase
                .from("connection_requests")
                .insert({
                    requester_id: user.id,
                    receiver_id: targetUser.id,
                    status: "pending",
                });

            if (error) throw error;

            setPendingRequests((prev) => new Set(prev).add(targetUser.id));
            toast({
                title: "Request Sent",
                description: `Connection request sent to ${getUserDisplayName(targetUser)}.`,
            });

            if (currentUserName) {
                await notifyConnectionRequest(targetUser.id, currentUserName, user.id);
            }
        } catch (error) {
            console.error("Connection request error:", error);
            toast({
                title: "Error",
                description: "Failed to send connection request.",
                variant: "destructive",
            });
        } finally {
            setConnectingUserIds((prev) => {
                const next = new Set(prev);
                next.delete(targetUser.id);
                return next;
            });
        }
    };

    const clearSearch = () => {
        setQuery("");
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    const getUserDisplayName = (user: SearchResult) => {
        const firstName = user.first_name || "";
        const lastName = user.last_name || "";
        return `${firstName} ${lastName}`.trim() || "Unknown User";
    };

    const getUserInitials = (user: SearchResult) => {
        const first = user.first_name?.charAt(0) || "";
        const last = user.last_name?.charAt(0) || "";
        return `${first}${last}`.toUpperCase() || "U";
    };

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
                <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search users..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim().length >= 2 && searchableResults.length > 0 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="pl-9 pr-8 h-9 w-48 lg:w-64 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-white/40 transition-all"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="h-3 w-3 text-white/60" />
                    </button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-[100]">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            Searching...
                        </div>
                    ) : searchableResults.length > 0 ? (
                        <ul className="max-h-80 overflow-y-auto">
                            {searchableResults.map((user, index) => (
                                <li
                                    key={user.id}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                                        selectedIndex === index && "bg-gray-50"
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleSelectUser(user)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    >
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-semibold text-sm overflow-hidden flex-shrink-0">
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={getUserDisplayName(user)}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span>{getUserInitials(user)}</span>
                                            )}
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {getUserDisplayName(user)}
                                            </p>
                                            {(user.sport || user.university) && (
                                                <p className="text-sm text-gray-500 truncate">
                                                    {[user.sport, user.university].filter(Boolean).join(" • ")}
                                                </p>
                                            )}
                                        </div>

                                    </button>
                                    {connectedUsers.has(user.id) ? (
                                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
                                            Connected
                                        </span>
                                    ) : pendingRequests.has(user.id) ? (
                                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                                            Pending
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(event) => handleConnect(user, event)}
                                            disabled={connectingUserIds.has(user.id)}
                                            className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <UserPlus className="h-3 w-3" />
                                            {connectingUserIds.has(user.id) ? "Sending" : "Connect"}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : query.trim().length >= 2 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No users found for "{query}"
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};
