import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
  
  try {
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Successfully loaded /');
    
    await page.goto('http://localhost:4200/ascenso/sign-in', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Successfully loaded /ascenso/sign-in');
  } catch (e) {
    console.error('Error navigating:', e.message);
  } finally {
    await browser.close();
  }
})();
