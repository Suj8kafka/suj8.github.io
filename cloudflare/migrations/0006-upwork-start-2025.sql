-- Match the owner-confirmed date and docs/Sujeet_Khadka_Resume.pdf.
UPDATE portfolio_knowledge
SET content = replace(content, 'From August 2026 to the present', 'From August 2025 to the present'),
    keywords = replace(keywords, '2026', '2025'),
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'experience-upwork';
