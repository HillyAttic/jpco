/**
 * Critical CSS Component
 * Inlines essential styles for above-the-fold content
 * Prevents render-blocking CSS
 */

export function CriticalCSS() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          /* Reset and base styles */
          *,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:currentColor}
          html{line-height:1.5;-webkit-text-size-adjust:100%;tab-size:4;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif}
          body{margin:0;line-height:inherit}
          
          /* Loading skeleton animation */
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
          .animate-pulse{animation:pulse 2s cubic-bezier(.4,0,.6,1) infinite}
          
          /* Critical layout */
          .container{width:100%;margin-left:auto;margin-right:auto;padding-left:1rem;padding-right:1rem}
          @media(min-width:640px){.container{max-width:640px}}
          @media(min-width:768px){.container{max-width:768px}}
          @media(min-width:1024px){.container{max-width:1024px}}
          @media(min-width:1280px){.container{max-width:1280px}}
          
          /* Utility classes for initial render */
          .hidden{display:none}
          .flex{display:flex}
          .grid{display:grid}
          .relative{position:relative}
          .absolute{position:absolute}
          .fixed{position:fixed}
          .inset-0{top:0;right:0;bottom:0;left:0}
          .z-50{z-index:50}
          
          /* Loading state */
          .loading-skeleton{
            background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
            background-size:200% 100%;
            animation:loading 1.5s ease-in-out infinite
          }
          @keyframes loading{0%{background-position:200% 0}100%{background-position:-200% 0}}
          
          /* Dark mode support */
          @media(prefers-color-scheme:dark){
            .loading-skeleton{background:linear-gradient(90deg,#374151 25%,#1f2937 50%,#374151 75%)}
          }
        `,
      }}
    />
  );
}
