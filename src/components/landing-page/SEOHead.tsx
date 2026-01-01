import { useEffect } from 'react';

export const SEOHead = () => {
  useEffect(() => {
    // Set page title
    document.title = "LaceUP - Professional Networking for Athletes | Join the Waitlist";

    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Join LaceUP, the exclusive professional network for athletes. Connect with mentors, alumni, and career opportunities. Empowering student-athletes to transition beyond the game and succeed in business.');

    // Set Open Graph tags for social media
    const ogTags = [
      { property: 'og:title', content: 'LaceUP - Professional Networking for Athletes' },
      { property: 'og:description', content: 'Life beyond the game starts here. Built exclusively for athletes transitioning from their sport into their careers. Connecting talent with mentors, alumni, and real professional opportunities.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: window.location.href },
      { property: 'og:site_name', content: 'LaceUP' },
      { property: 'og:image', content: `${window.location.origin}/laceup-logo-with-branding.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
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
      { name: 'twitter:image', content: `${window.location.origin}/laceup-logo-with-branding.png` },
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