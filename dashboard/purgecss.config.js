module.exports = {
  content: [
    './src/**/*.{html,ts}',
    './src/**/*.component.html',
    './src/**/*.component.ts',
    './dist/**/*.js'
  ],
  css: [
    './src/**/*.css'
  ],
  defaultExtractor: content => {
    const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
    const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
    return broadMatches.concat(innerMatches);
  },
  safelist: [
    // Angular Material classes
    /^mat-/,
    /^cdk-/,
    // Angular animation classes
    /^ng-/,
    // Custom safe classes
    'active',
    'selected',
    'disabled',
    'loading',
    // Dynamic classes that might be added via JavaScript
    /^btn-/,
    /^alert-/,
    /^text-/,
    /^bg-/,
    // Task management specific classes
    /^task-/,
    /^status-/,
    /^category-/,
    /^priority-/
  ]
};
