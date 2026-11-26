-- Match docs/Sujeet_Khadka_Resume.pdf: Jan-Mar / Apr-Jun 2026.
UPDATE portfolio_knowledge
SET content = 'Sujeet worked at Neptune TechZone on Aama Cure as a UI/UX Design Intern from January to March 2026, then as a Junior Designer from April to June 2026. He researched interface patterns, designed user flows and Figma prototypes, incorporated developer guidance, and reviewed web/UI implementation. This employment has ended.',
    keywords = 'career experience neptune techzone aama cure january march april june 2026 ui ux design intern junior designer completed employment',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'experience-neptune';
