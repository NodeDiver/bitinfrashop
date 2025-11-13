# TODO - Project Task List v1.0

A human-readable list of tasks and improvements for the Bitinfrashop - Bitcoin Subscription Management platform.

## 🎯 Future Enhancements

### Backend & Data Integrity
- **BTCPay Store ID persistence**: Add `btcpayStoreId` field to Shop model in database
  - Update `src/app/api/stores/[serverId]/route.ts` to match on store ID instead of names
  - Ensures accurate "hasActiveSubscription" detection
- **API consistency**: Standardize naming convention across backend and frontend
  - Convert all `server-prisma.ts` responses to use snake_case
  - Update pages like `src/app/infrastructure/page.tsx` to match API format
  - Remove camelCase/snake_case mixing throughout the codebase

### Security & Authentication
- **Password handling fix**: Remove `sanitizeString` calls before password hashing
  - Fix `src/app/api/auth/login/route.ts` to preserve password characters
  - Fix `src/app/api/auth/register/route.ts` to preserve password characters
  - Currently strips `<`/`>` characters and trims, which mangles credentials
- **Auth module consolidation**: Remove legacy `src/lib/auth.ts` file
  - Point all imports to `auth-prisma.ts` for single source of truth
  - Resolve type mismatches in client context caused by mixed imports
- **Two-Factor Authentication (2FA)**: Implement 2FA toggle in settings (future enhancement)
  - Add TOTP/authenticator app support
  - Backend: Generate and validate 2FA codes
  - Frontend: Settings toggle + QR code setup flow
- **Email Notifications System**: Implement email notification preferences (future enhancement)
  - Backend: Email service integration (SendGrid, Postmark, etc.)
  - Settings: Toggle for account activity emails
  - Email templates for subscriptions, payments, alerts
- **Lightning Network Alerts**: Implement Lightning payment notifications (future enhancement)
  - Real-time alerts for payment status changes
  - Settings: Toggle for Lightning-specific alerts
  - Push notifications or email alerts
- **Account Connections**: Display linked accounts in settings (future enhancement)
  - Show Google, GitHub, Nostr, or other OAuth connections
  - Allow users to link/unlink external accounts
  - Display connection status and last used date

### UI Design System
- **Professional color palette refresh**: Update `tailwind.config.js` with refined colors
  - Primary: Deep navy `#14213D`
  - Accent: Bitcoin orange `#F7931A`
  - Support: Professional teal `#2A9D8F`
  - Neutrals: Light gray `#F4F6F8` and dark gray `#1F2933`
  - Remove current neon gradients for calmer light/dark themes
- **Button styling normalization**: Consistent button design across all pages
  - Apply new palette with flat fills and subdued shadows
  - Standardize sizing and spacing (remove hover scale/gradient jumps)
  - Update `src/app/page.tsx`, `src/components/TopBar.tsx`, and auth forms
- **Icon system upgrade**: Replace emoji icons with professional icon set
  - Replace emoji tab icons in `src/app/settings/page.tsx` with Heroicons
  - Tighten spacing for more professional appearance
  - Remove playful emoji bullets from marketing sections

### Page-Level Improvements
- **Homepage marketing refresh**: Rework `src/app/page.tsx` layout
  - Rely on stronger typography and whitespace
  - Use real product imagery instead of stacked emoji cards
  - Reduce accent colors per section for cleaner look
- **Card component standardization**: Update infrastructure and dashboard cards
  - Create single unified card component
  - Implement quieter hover states with solid borders
  - Align iconography across `src/app/infrastructure/page.tsx` and `src/app/dashboard/page.tsx`
- **Secondary pages audit**: Polish auth and management pages
  - Remove green/blue gradients from `src/app/login/page.tsx` and `src/app/register/page.tsx`
  - Switch CTA buttons to new primary color
  - Add heading/subheading pairs matching home hero style
  - Update `src/app/nwc-management/page.tsx` for consistency

### Contact & Communication
- **Contact functionality**: Implement "Contact Admin" and "Contact Shop" buttons
  - Add contact modal or email integration
  - Store contact preferences in user profiles
  - Enable messaging between shop owners and server providers

## ✅ Recently Completed - Version 0.3.0 (October 2025)

### Marketplace Transformation & BTCMap Integration
- **✅ BTCMap Integration**: Real-time discovery of Bitcoin-accepting shops worldwide
  - Interactive map view with location-based search
  - Real-time data from BTCMap API
  - Global visibility for Bitcoin merchants
  - Shop type filtering (Online Store vs Physical Shop)
- **✅ Enhanced Marketplace Features**: Advanced discovery and browsing
  - Category-based filtering for infrastructure providers and shops
  - Search functionality across all listings
  - Improved card layouts with aligned sticky footers
  - Better visual hierarchy and information display
  - Accurate counter displays for marketplace totals
- **✅ Connection System**: Shop-provider matching
  - Notification system for shops seeking infrastructure providers
  - Connection workflow between shops and Lightning providers
  - Enhanced communication and request/acceptance flow
  - Improved discovery page with marketplace focus
- **✅ UX Improvements**: Polish and refinement
  - Shop type labels (Online Store/Physical Shop) for clarity
  - Consistent card patterns across all marketplace views
  - Improved mobile responsiveness
  - Better navigation and user flows
- **✅ Technical Improvements**: Code quality and performance
  - Database query optimizations for marketplace data
  - Component architecture refinements
  - Better state management for map interactions
  - Performance improvements for large data sets
  - Cleaner separation of concerns

---

## ✅ Recently Completed - Version 0.2.0 (October 2025)

### Platform Unification
- **✅ User role removal**: Eliminated role-based account types (PROVIDER, SHOP_OWNER, BITCOINER)
  - All users now have access to all platform features
  - Simplified user experience without forced categorization
  - Users can list services, manage shops, and discover businesses from one account
- **✅ Database schema simplification**: Removed UserRole enum and role field
  - Updated Prisma schema to remove role distinctions
  - Successfully migrated database with unified user structure
  - Reseeded database with 8 test users without roles
- **✅ Registration flow update**: Streamlined signup process
  - Removed role selection from registration page
  - Updated registration API to not require role
  - Simplified user creation in auth-prisma.ts
- **✅ Auth system updates**: Removed role handling throughout auth flow
  - Updated User interface in auth-prisma.ts
  - Cleaned up all database queries (getUserById, getUserByUsername, createUser, verifyUser)
  - Updated registration and login API routes

### UI/UX Redesign
- **✅ Unified color scheme**: Transitioned to warm orange/amber branding
  - Changed all primary buttons to orange gradient
  - Updated TopBar login button from blue to orange
  - Replaced BTCMap icon color from blue to amber
  - Changed Infrastructure icon color from green to red
- **✅ Homepage redesign**: Replaced role-segregated layout with unified approach
  - Removed three colored user-type cards
  - Added unified hero section: "Join the Bitcoin Marketplace"
  - Created 6-card feature grid showcasing platform capabilities
  - Simplified "How It Works" to generic 3-step process
- **✅ Documentation updates**: Reflected changes across all documentation
  - Updated README.md with unified usage section
  - Enhanced COLOR_ACCESSIBILITY.md with platform unification notes
  - Created comprehensive development log entry
  - Updated TODO.md (this file) with completed tasks

## ✅ Recently Completed - Version 0.1.0 (September 2025)

### Major UI Improvements
- **✅ Interactive button effects**: Added magnetic pull, glow, icon rotation, shadow pulse, and color wave effects
  - All buttons now have hover animations for engaging user experience
  - Smooth transitions using CSS transforms for optimal performance
- **✅ Typography refresh**: Replaced Geist fonts with Manrope + Roboto Mono
  - Warmer, community-friendly font combination
  - Professional sans-serif paired with clean monospace for technical content
- **✅ Avatar system**: Implemented themed icons for servers and shops
  - Automatic 2-letter initials from names
  - Soft slate-based gradients with emerald (servers) and orange (shops) accents
  - Squared corners with slight rounding for modern look
  - Support for future image uploads
- **✅ Shop descriptions**: Added description field to shop listings
  - Updated Prisma schema with description field
  - Modified all shop functions to include descriptions
  - Display descriptions at end of shop cards matching server format
- **✅ Server listing enhancements**: Added owner and lightning address information
  - Server cards now show owner username
  - Display creation date and lightning address
  - Consistent information display matching shop listings
- **✅ Login button gradient**: Fixed gradient to end with dark blue `#101828`
  - Replaced black ending with proper dark blue matching login page background
  - Maintains blue finish on hover state
- **✅ Button redesign**: Replaced text links with styled action buttons
  - "More Details" buttons with themed gradients
  - "Contact Admin" and "Contact Shop" buttons added
  - "Manage Server" and "Manage Shop" buttons for user's own items
  - Consistent sizing and professional appearance across all listings

### Technical Infrastructure
- **✅ Google OAuth integration**: Added NextAuth.js with Google provider
  - Complete OAuth flow implementation
  - Prisma schema updates for Account, Session, and VerificationToken models
  - Optional configuration based on environment variables
  - Comprehensive setup documentation in `GOOGLE_OAUTH_SETUP.md`
- **✅ Database schema improvements**: Enhanced Shop and Server models
  - Added description field to shops
  - Added owner_username to shop interfaces
  - Improved query efficiency with proper relations
- **✅ Color palette system**: Established professional color scheme
  - Custom Tailwind colors for BTCPay servers (green tones)
  - Custom colors for shops (orange tones)  
  - Login-specific blue colors (`#101828`)
  - Consistent gradient system across all buttons

### Code Quality & Organization
- **✅ Commit message standards**: Enforced conventional commits format
  - Using `feat:`, `fix:`, `chore:` prefixes
  - Maximum 140 characters per commit message
  - Single sentence descriptions for clarity
- **✅ Component architecture**: Created reusable Avatar component
  - Type-safe props with TypeScript
  - Flexible sizing (sm, md, lg)
  - Theme-aware with server/shop type distinction

## 📝 Development Notes

### Design Principles
- **Simplicity first**: Keep interfaces clean and intuitive
- **Professional aesthetics**: Avoid playful elements in favor of trust and credibility
- **Consistency**: Maintain uniform styling across all pages and components
- **Performance**: Use CSS transforms for animations, avoid heavy JavaScript
- **Accessibility**: Ensure all interactive elements are keyboard accessible

### Technical Standards
- **TypeScript everywhere**: No JavaScript files in source code
- **Prisma best practices**: Use proper relations and snake_case for database fields
- **Tailwind conventions**: Utilize custom colors from config, avoid arbitrary values
- **Component reusability**: Extract common patterns into shared components
- **Git workflow**: Feature branches, conventional commits, thorough PR reviews

**Current Status (October 2025)**: Platform successfully transformed into full Bitcoin marketplace with BTCMap integration for global discovery. Version 0.3.0 complete with marketplace features, connection system, and enhanced UX. Ready for continued feature development and community growth.
