/* ------------------------------------------------------------------
   Barbam x Le Chamber: the only file you need to edit.
   Save, then redeploy (vercel --prod). Nothing else has to change.

   The guest picks a cocktail and a night, gives a name and the
   number of guests, then the last button ("Continue to Resy") opens the
   link you set below.
------------------------------------------------------------------- */
window.SITE = {

  /* Where the last button sends the guest. Each night opens that night's Resy event.
     Three ways to fill a cocktail in:
       1) one link for everything:      binaeng: 'https://...',
       2) one link per night:           binaeng: { dec7: 'https://...', dec8: 'https://...' },
       3) one link per night and time:  binaeng: { dec7: { '6:00 PM': '...', '7:30 PM': '...', '9:00 PM': '...', '10:30 PM': '...' }, dec8: { ... } },
          (in form 3, a time with an empty link shows as full)
     While every link for a cocktail is empty, its card reads "Booking opens soon". */
  links: {
    binaeng: {
      dec7: 'https://resy.com/cities/new-york-ny/venues/bar-bam/events/le-chamber-2026-12-07-6',
      dec8: 'https://resy.com/cities/new-york-ny/venues/bar-bam/events/le-chamber-2-2026-12-08-6'
    },
    bungeoppang: {
      dec7: 'https://resy.com/cities/new-york-ny/venues/bar-bam/events/le-chamber-2026-12-07-6',
      dec8: 'https://resy.com/cities/new-york-ny/venues/bar-bam/events/le-chamber-2-2026-12-08-6'
    }
  },

  /* false = the guest picks the cocktail and night here and the time on Resy.
     true  = the page also asks for the time (four seatings), and the automatic block on
             parties of 3 or 4 works. With false, that block is off and Resy's floor plan is the only stop. */
  askTime: false,

  /* Only used when askTime is true. Times to show as full. Example: ['dec7 7:30 PM', 'dec8 9:00 PM'] */
  full: [],

  /* Largest party the page lets a guest enter. */
  maxParty: 4,

  /* Tables per seating that seat 3 or 4 (the rest seat two).
     With the sheet connected (signupEndpoint below), the page counts the parties of 3 or 4 logged for each
     seating and stops offering 3 or 4 there once this many are taken. The sheet's own setting, bb_big_tables,
     wins over this number when the sheet answers. */
  bigTables: 2,

  /* Seatings where the tables for 3 or 4 are gone, set by hand. The page then only offers tables for two there.
     Use it when Resy shows the four-tops booked, or when the sheet is not connected.
     Example: ['dec7 7:30 PM', 'dec8 9:00 PM'] */
  bigFull: [],

  /* Shown on the back of each card and in the summary. Leave '' to hide the price. Example: '$24' */
  prices: {
    binaeng: '$27',
    bungeoppang: '$27'
  },

  /* One short line at the bottom of each card. Leave '' to hide.
     Example: 'Prepaid cocktails are non-refundable inside 24 hours.' */
  finePrint: '$27 per guest, prepaid on Resy. Full refund if you cancel by 6 PM two days before your night: Sat Dec 5 for Monday, Sun Dec 6 for Tuesday. After that, and for no-shows, it is not refunded.',

  /* Google Apps Script web app URL (ends in /exec).
     Turns on the "Can't make either night?" list, writes each guest's name, party size,
     cocktails, night and time to the "Barbam Picks" tab as they leave for Resy, and
     turns on the automatic block for parties of 3 or 4.
     Leave '' to switch all three off. */
  signupEndpoint: 'https://script.google.com/macros/s/AKfycbydX7Bb7yFQtnByL6bRGH1aUJPVYXlehpAGAqFgTia_kKcRmljkHyrZ2-yjauJmNNI/exec'
};
