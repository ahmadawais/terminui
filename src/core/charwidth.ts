// Wide character detection for terminal rendering.
// Characters that occupy 2 cells in terminal emulators.

const isWideChar = (code: number): boolean => {
	if (
		// Hangul Jamo
		(code >= 0x1100 && code <= 0x115f) ||
		// CJK Radicals, Kangxi Radicals, CJK Symbols and Punctuation
		(code >= 0x2e80 && code <= 0x303e) ||
		// Hiragana, Katakana, Bopomofo, Hangul Compat Jamo, Kanbun, CJK Strokes
		(code >= 0x3041 && code <= 0x33bf) ||
		// CJK Unified Ideographs
		(code >= 0x4e00 && code <= 0x9fff) ||
		// Hangul Syllables
		(code >= 0xac00 && code <= 0xd7a3) ||
		// CJK Compatibility Ideographs
		(code >= 0xf900 && code <= 0xfaff) ||
		// CJK Compatibility Forms
		(code >= 0xfe30 && code <= 0xfe6f) ||
		// Fullwidth Forms
		(code >= 0xff01 && code <= 0xff60) ||
		(code >= 0xffe0 && code <= 0xffe6) ||
		// CJK Extension B+
		(code >= 0x20000 && code <= 0x2fffd) ||
		(code >= 0x30000 && code <= 0x3fffd) ||
		// Emoji and symbols with default emoji presentation
		// (commonly rendered as 2-wide in modern terminal emulators)
		(code >= 0x231a && code <= 0x231b) ||
		(code >= 0x23e9 && code <= 0x23f3) ||
		(code >= 0x23f8 && code <= 0x23fa) ||
		code === 0x25b6 || // ▶ Black Right-Pointing Triangle
		code === 0x25c0 || // ◀ Black Left-Pointing Triangle
		(code >= 0x25fb && code <= 0x25fe) ||
		(code >= 0x2614 && code <= 0x2615) ||
		(code >= 0x2648 && code <= 0x2653) ||
		code === 0x267f ||
		code === 0x2693 ||
		code === 0x26a1 ||
		(code >= 0x26aa && code <= 0x26ab) ||
		(code >= 0x26bd && code <= 0x26be) ||
		(code >= 0x26c4 && code <= 0x26c5) ||
		code === 0x26ce ||
		code === 0x26d4 ||
		code === 0x26ea ||
		(code >= 0x26f2 && code <= 0x26f3) ||
		code === 0x26f5 ||
		code === 0x26fa ||
		code === 0x26fd ||
		code === 0x2702 ||
		code === 0x2705 ||
		(code >= 0x2708 && code <= 0x270d) ||
		code === 0x270f ||
		code === 0x2712 ||
		code === 0x2714 ||
		code === 0x2716 ||
		code === 0x271d ||
		code === 0x2721 ||
		code === 0x2728 ||
		(code >= 0x2733 && code <= 0x2734) ||
		code === 0x2744 ||
		code === 0x2747 ||
		code === 0x274c ||
		code === 0x274e ||
		(code >= 0x2753 && code <= 0x2755) ||
		code === 0x2757 ||
		(code >= 0x2763 && code <= 0x2764) ||
		(code >= 0x2795 && code <= 0x2797) ||
		code === 0x27a1 ||
		code === 0x27b0 ||
		code === 0x27bf ||
		(code >= 0x2934 && code <= 0x2935) ||
		(code >= 0x2b05 && code <= 0x2b07) ||
		(code >= 0x2b1b && code <= 0x2b1c) ||
		code === 0x2b50 ||
		code === 0x2b55 ||
		// Emoji blocks (SMP)
		(code >= 0x1f000 && code <= 0x1faff)
	) {
		return true;
	}
	return false;
};

export { isWideChar };
