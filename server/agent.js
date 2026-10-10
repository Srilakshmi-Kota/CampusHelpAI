import { faqs } from "./faqData.js";

export function answerQuestion(message) {
  const text = String(message || "").toLowerCase().trim();
  if (!text) return { answer: "Please type a question about college support, exams, fees, facilities, or IT.", matches: [] };

  const ranked = faqs.map(faq => {
    const terms = [faq.question, faq.answer, ...faq.keywords, faq.category].join(" ").toLowerCase();
    let score = 0;
    for (const word of text.split(/[^a-z0-9-]+/).filter(w => w.length > 2)) {
      if (terms.includes(word)) score += faq.keywords.some(k => k.includes(word) || word.includes(k)) ? 3 : 1;
    }
    return { faq, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  if (/(hello|hi|hey|good morning|good afternoon)/.test(text)) {
    return { answer: "Hello! I'm CampusHelp AI. I can help you find college FAQ information, exam guidance, or report an issue. What do you need help with?", matches: [] };
  }
  if (/(create|register|raise|submit).*(ticket|complaint|issue)/.test(text) || /(report|complaint).*(issue|problem)/.test(text)) {
    return { answer: "You can report it in the “Report a Complaint” section on this page. Add a clear title, category, and description; your ticket code will appear after submission.", matches: [] };
  }
  if (ranked.length) return { answer: ranked[0].faq.answer, matches: ranked.map(x => ({ question: x.faq.question, category: x.faq.category, answer: x.faq.answer })) };
  return { answer: "I couldn't find a close match in the sample college FAQ. Try terms such as exam timetable, hall ticket, attendance, fees, Wi-Fi, projector, or submit a complaint. You can also report an issue below.", matches: [] };
}
