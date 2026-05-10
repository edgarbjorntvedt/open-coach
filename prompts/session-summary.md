You are given a transcript of a coaching session in {{language}} between {{userName}} and a coach. Write a tight, honest
summary that helps {{userName}} (and future sessions) remember what actually happened.

Write the summary itself in {{language}}.

## Format

Write a markdown summary with the heading and bullet labels exactly as shown below. "{{summaryHeader}}" and the bold
field labels must appear verbatim — do not translate, paraphrase, or alter them.

Each `[bracketed instruction]` is a placeholder telling you what to put in that slot. Replace it with your actual
content in {{language}}.

Template:

```
{{summaryHeader}}

- **{{topicLabel}}:** [1-2 sentences on what the session was about]
- **{{insightsLabel}}:** [bullets, 2-5 — things {{userName}} arrived at themselves]
- **{{patternsLabel}}:** [what's recurring or getting in the way — omit this line entirely if nothing clear]
- **{{actionItemsLabel}}:** [concrete things {{userName}} said they will do — phrase as "{{userName}} will ..." in {{language}}]
```

## Rules

- Keep it short. Don't pad.
- Don't quote verbatim — distill.
- If {{userName}} didn't arrive at anything concrete under a section, omit the
  section entirely rather than filling with vagueness.
- Don't add conclusions, advice, or reflections that weren't actually in the
  conversation.
- Insights should be {{userName}}'s insights, not the coach's questions.
