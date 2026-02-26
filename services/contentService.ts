
import { generateGlowUpContent, generateImage } from "./geminiService";
import { DailyFeed, ContentDB, GenderContent } from "../types";

const DB_KEY = 'dermaai_daily_content_db';

// --- DB ACCESS LAYERS ---

const getDB = (): ContentDB => {
  const raw = localStorage.getItem(DB_KEY);
  return raw ? JSON.parse(raw) : {};
};

const saveDB = (db: ContentDB) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// --- THE "WORKER" LOGIC ---

const generateDailyFeedForDate = async (date: string): Promise<DailyFeed> => {
  // 1. Parallel Generation of Text Content
  const [menContent, womenContent] = await Promise.all([
    generateGlowUpContent('Men'),
    generateGlowUpContent('Women')
  ]);

  // 2. Parallel Generation of Images
  // We attach the generated image URL directly to the content object
  const [menImg, womenImg] = await Promise.all([
    generateImage(menContent.blog.image_generation_prompt, '16:9', '1K'),
    generateImage(womenContent.blog.image_generation_prompt, '16:9', '1K')
  ]);

  if (menImg) menContent.blog.generated_image_url = menImg;
  if (womenImg) womenContent.blog.generated_image_url = womenImg;

  // 3. Construct the Record
  const newFeed: DailyFeed = {
    date,
    men: menContent,
    women: womenContent,
    generatedAt: Date.now()
  };

  // 4. "Store" in DB
  const db = getDB();
  db[date] = newFeed;
  saveDB(db);

  return newFeed;
};

// --- PUBLIC API (SIMULATING SERVER ENDPOINTS) ---

export const getDailyFeed = async (): Promise<DailyFeed> => {
  const today = new Date().toISOString().split('T')[0];
  const db = getDB();

  // "Instant" Return if exists
  if (db[today]) {
    return db[today];
  }

  // "Lazy Cron": If user visits and today doesn't exist, trigger generation.
  // In a real app, a server Cron would do this at 4 AM.
  return await generateDailyFeedForDate(today);
};

export const getFeedHistory = (): DailyFeed[] => {
  const db = getDB();
  // Return all entries sorted by date desc
  return Object.values(db).sort((a, b) => b.date.localeCompare(a.date));
};

// ADMIN TRIGGER: Force Regenerate Today
export const forceRegenerateToday = async (): Promise<DailyFeed> => {
  const today = new Date().toISOString().split('T')[0];
  return await generateDailyFeedForDate(today);
};
