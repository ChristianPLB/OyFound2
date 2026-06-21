function Home() {
  return (
    <div className="hero-container">
      {/* Layered Wave Background */}
      <div className="background-waves">
        <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          {/* Base Layer (Darkest) */}
          <rect width="1440" height="800" fill="#ffffff" />
          
          {/* Wave Layer 1 */}
          <path d="M-100 150C200 50 400 450 800 250C1200 50 1500 350 1600 150V850H-100V150Z" fill="#ffb2e8" filter="url(#shadow)"/>
          
          {/* Wave Layer 2 */}
          <path d="M-100 350C300 250 550 650 900 350C1250 50 1450 550 1600 350V850H-100V350Z" fill="#99638a" filter="url(#shadow)"/>
          
          {/* Wave Layer 3 */}
          <path d="M-100 550C400 450 650 850 1000 550C1350 250 1450 750 1600 550V850H-100V550Z" fill="#8c3676" filter="url(#shadow)"/>
          
          {/* Wave Layer 4 (Lightest) */}
          <path d="M-100 700C500 650 750 950 1100 700C1450 450 1550 900 1650 750V850H-100V700Z" fill="#6a1841" filter="url(#shadow)"/>

          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="-10" stdDeviation="15" flood-opacity="0.3" />
            </filter>
          </defs>
        </svg>
      </div>

      <div className="content">
        <h1 className="title">Welcome to <span className="brand">OyFound</span></h1>
        <h2 className="subtitle">Helping What’s Lost Find Its Way Back</h2>
        
        <p className="description">
          A smarter lost-and-found platform designed to reunite people with 
          their belongings—quickly, securely, and stress-free.
        </p>
      </div>
    </div>
  );
}

export default Home;