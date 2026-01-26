import { useState, useEffect, useRef } from "react";
import { Search, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SearchResult {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    sport: string | null;
    university: string | null;
}

export const UserSearchBar = ({ className }: { className?: string }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
                const searchTerm = `%${query.trim()}%`;
                const { data, error } = await supabase
                    .from("profiles")
                    .select("id, first_name, last_name, avatar_url, sport, university")
                    .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
                    .limit(8);

                if (error) {
                    console.error("Search error:", error);
                    setResults([]);
                } else {
                    setResults(data || []);
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
                if (!isOpen || results.length === 0) return;
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                break;
            case "ArrowUp":
                if (!isOpen || results.length === 0) return;
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    handleSelectUser(results[selectedIndex]);
                } else if (results.length === 1) {
                    // If only one result, go directly to that user's profile
                    handleSelectUser(results[0]);
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

    const handleSelectUser = (user: SearchResult) => {
        navigate(`/profile/${user.id}`);
        setQuery("");
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
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
                    onFocus={() => query.trim().length >= 2 && results.length > 0 && setIsOpen(true)}
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
                    ) : results.length > 0 ? (
                        <ul className="max-h-80 overflow-y-auto">
                            {results.map((user, index) => (
                                <li key={user.id}>
                                    <button
                                        onClick={() => handleSelectUser(user)}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={cn(
                                            "w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left",
                                            selectedIndex === index && "bg-gray-50"
                                        )}
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

                                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                    </button>
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
