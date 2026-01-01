export const EMOJI_CATEGORIES = {
    "Achievement": ["🏆", "🥇", "🥈", "🥉", "👑", "🎖️", "⭐", "🌟"],
    "Performance": ["💪", "🏃", "⚽", "🏋️", "🎯", "🚀", "⚡", "🔥"],
    "Professional": ["💼", "👔", "📊", "📈", "📱", "🔝", "✅", "🤝"],
    "Skills & Growth": ["🧠", "💡", "🎓", "📚", "🔧", "🛠️", "📖", "💻"],
    "Community": ["👥", "💬", "🌐", "👨‍🏫", "👩‍🏫", "🫱", "🫲", "🤲"]
} as const;

export type EmojiCategory = keyof typeof EMOJI_CATEGORIES;
