import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SkillSelectorProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  maxSkills?: number;
}

const SUGGESTED_SKILLS = [
  "Leadership",
  "Teamwork",
  "Communication",
  "Time Management",
  "Problem Solving",
  "Strategic Planning",
  "Project Management",
  "Public Speaking",
  "Networking",
  "Social Media",
  "Marketing",
  "Sales",
  "Brand Development",
  "Content Creation",
  "Event Management",
  "Coaching",
  "Mentoring",
  "Analytics",
  "Microsoft Office",
  "Data Analysis",
  "Customer Service",
  "Conflict Resolution",
  "Adaptability",
  "Critical Thinking",
  "Collaboration",
];

export const SkillSelector = ({ skills, onChange, maxSkills = 20 }: SkillSelectorProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = SUGGESTED_SKILLS.filter(
        skill =>
          skill.toLowerCase().includes(inputValue.toLowerCase()) &&
          !skills.includes(skill)
      ).slice(0, 8);
      setFilteredSuggestions(filtered);
    } else {
      const unselected = SUGGESTED_SKILLS.filter(skill => !skills.includes(skill)).slice(0, 8);
      setFilteredSuggestions(unselected);
    }
  }, [inputValue, skills]);

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !skills.includes(trimmedSkill) && skills.length < maxSkills) {
      onChange([...skills, trimmedSkill]);
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addSkill(inputValue);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="px-3 py-1.5 text-sm flex items-center gap-1.5"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                className="hover:bg-background/20 rounded-full p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={skills.length >= maxSkills ? "Maximum skills reached" : "Add a skill..."}
          disabled={skills.length >= maxSkills}
          className="pr-10"
        />
        {inputValue.trim() && (
          <Button
            type="button"
            size="sm"
            onClick={() => addSkill(inputValue)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="border rounded-md bg-background shadow-lg p-2 space-y-1 max-h-60 overflow-y-auto">
          <p className="text-xs text-muted-foreground px-2 py-1 font-medium">
            {inputValue.trim() ? "Matching skills" : "Suggested skills"}
          </p>
          {filteredSuggestions.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => addSkill(skill)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary rounded-md transition-colors flex items-center justify-between group"
            >
              <span>{skill}</span>
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {skills.length}/{maxSkills} skills added
      </p>
    </div>
  );
};
