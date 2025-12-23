import { useEffect } from 'react';

export function SEOHead() {
  useEffect(() => {
    // Set page title
    document.title = "LaceUp - Professional Networking for Athletes | Join the Waitlist";
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Join LaceUp, the exclusive professional network for athletes. Connect with mentors, alumni, and career opportunities. Empowering student-athletes to transition beyond the game and succeed in business.');
    
    // Set Open Graph tags for social media
    const ogTags = [
      { property: 'og:title', content: 'LaceUp - Professional Networking for Athletes' },
      { property: 'og:description', content: 'Connect. Transition. Succeed Beyond the Game. Join 100+ athletes and 20+ business leaders transforming athletic careers. Shark Tank Finalist Oct 30.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.href },
      { property: 'og:site_name', content: 'LaceUp' },
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // Set Twitter Card tags
    const twitterTags = [
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:site', content: '@laceupnetwork' },
      { name: 'twitter:creator', content: '@laceupnetwork' },
      { name: 'twitter:title', content: 'LaceUp - Professional Networking for Athletes' },
      { name: 'twitter:description', content: 'Connect. Transition. Succeed Beyond the Game. Join the exclusive network for athletes, mentors, and businesses.' },
    ];

    twitterTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // Set keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', 'athlete networking, sports career transition, athlete jobs, athlete mentorship, college athletes, professional athletes, athlete career platform, sports to business, athlete recruitment');

    // Set theme color
    let themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColor);
    }
    themeColor.setAttribute('content', '#0A2849');
    
  }, []);

  return null;
}