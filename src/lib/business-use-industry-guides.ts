import type { BusinessUseGuide } from "@/lib/business-use-guide";

// Each industry owns its copy. The storefront supplies only the shared design comparison.
export const industryBusinessGuides: Record<string, BusinessUseGuide> = {
  automotive: {
    headline: "NFC & QR Stands for Dealerships & Auto Shops",
    seoTitle: "NFC & QR Stands for Dealerships & Auto Repair Shops",
    seoDescription: "Connect drivers to Google reviews, dealership profiles, and service information. Explore automotive NFC stands, Branded + QR designs, and counter placement tips.",
    introduction: "Make the next step easy for drivers at your dealership, repair shop, or service center. A Tap Rater stand opens an existing online destination from a sales desk or service counter, helping customers find the right branch without typing a business name. Choose a review profile or useful dealership information, then match the stand to that action. Standard provides NFC; Branded adds your business identity and a printed QR code for customers who prefer scanning.",
    recommendationsTitle: "Recommended Stands for Automotive Businesses",
    placementTitle: "Where to Place Stands in Your Dealership or Shop",
    howItWorksTitle: "How Your Automotive Stand Works",
    faqTitle: "Automotive Stand FAQs",
    recommendations: [
      { productSlug: "google-review-stand", goal: "Open your branch’s Google review page", reason: "Help customers find the review destination for the shop that serviced their vehicle. Keep the choice to review separate from payment, warranty discussions, and any request for a particular rating.", placement: "At the vehicle collection or service checkout desk." },
      { productSlug: "dealerrater-review-stand", goal: "Connect shoppers with your DealerRater profile", reason: "Give customers a clear route to the dealership profile you already maintain. Check the public destination and its available actions before configuring the stand for your showroom.", placement: "On a sales consultant’s desk or delivery counter." },
      { productSlug: "check-our-information-stand", goal: "Share useful dealership information", reason: "Point drivers to a public page with opening hours, service details, or aftercare information. A stable branch information page can serve visitors throughout their ownership experience.", placement: "Beside service reception or in the customer lounge." }
    ],
    placements: [
      { title: "Service collection desk", body: "Position the review stand where drivers pause after collecting their keys. Keep it away from card terminals and paperwork so the purpose is clear. Staff can point out the link without choosing who sees it based on how satisfied they appear or asking them to submit a rating on the spot." },
      { title: "Showroom and delivery area", body: "Use the profile stand near the end of a vehicle handover, where the customer has time to explore it. Match the destination to the dealership rather than a manufacturer’s general homepage. Leave room for a phone to approach the NFC area and keep the front design facing the visitor." },
      { title: "Waiting lounge", body: "An information stand can answer routine questions while a car is being serviced. Link to a concise mobile page covering your branch’s services and contact options. Avoid destinations containing an individual repair order or customer record; those belong in the systems your team already uses to communicate privately." }
    ],
    steps: [
      { title: "Choose the desk and action", body: "Decide whether the stand belongs at service collection, a sales desk, or the waiting area. Select a product whose invitation matches the destination. Compare Standard and Branded + QR options on its product page before choosing quantities for multiple departments." },
      { title: "Check the branch destination", body: "Open the proposed link on a phone outside your staff account. Confirm the dealership name, address, and available actions. For a Branded order, review the logo and branch details in the design preview so visitors recognize the location they have just visited." },
      { title: "Test after installation", body: "Place the stand on a clear surface and try the guest journey yourself. Test NFC and, where included, the printed QR. Let service advisors know which page opens, and check the destination again whenever a branch profile or website address changes." }
    ],
    faqs: [
      { question: "Should an auto shop choose Google or DealerRater?", answer: "Choose the destination your business actually maintains. Google can suit a local repair shop’s review page, while a dealership may also use a DealerRater profile. You do not need both on the same desk. Start with the profile that matches the customer action you want to make available." },
      { question: "Can each dealership branch have its own link?", answer: "Yes. Configure each stand with the destination for its intended branch. Check the address on the destination page and record where each stand will be installed. A service department and a sales department may need different links even when they share the same building and business branding." },
      { question: "Will a stand automatically collect a review?", answer: "No. It opens the destination you provide; the customer decides whether to leave a review and what to say. The review platform may ask them to sign in. Make the opportunity available consistently and do not promise incentives or a particular rating as part of using the stand." },
      { question: "Can I share service information instead of a review link?", answer: "Yes. Choose an information stand and supply a public page with your service details, hours, or contact options. Tap Rater does not manage repair bookings or vehicle records. If the page includes a booking link, your existing provider continues to handle scheduling and customer information." },
      { question: "What if a driver prefers scanning to NFC?", answer: "Choose Branded + QR to offer both options on the stand. Standard is NFC-only. A printed QR gives visitors another way to reach the destination using their phone camera. Confirm the available design and current price on the product page before ordering stands for your showroom or service desks." }
    ]
  },
  "hotel-travel": {
    headline: "NFC & QR Stands for Hotels & Guest Accommodation",
    seoTitle: "NFC & QR Stands for Hotels & Guest Accommodation",
    seoDescription: "Help hotel guests find property information, Google reviews, and Tripadvisor profiles. Compare NFC stands, Branded + QR options, and front desk placement ideas.",
    introduction: "Give hotel guests a convenient route to useful property information and the review profiles they recognize. Tap Rater stands connect your reception desk, concierge area, or checkout counter to an existing public page. Choose one clear purpose for each location so arrivals see practical information and departing guests can find a review destination. Standard stands support NFC tapping; Branded designs add your property name, logo, and printed QR code for guests who prefer their phone camera.",
    recommendationsTitle: "Recommended Stands for Hotels and Hosts",
    placementTitle: "Where to Place Stands Around Your Property",
    howItWorksTitle: "How Your Hotel Stand Works",
    faqTitle: "Hotel and Accommodation Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Share your public guest information", reason: "Open a mobile page covering facilities, breakfast times, transport, or contact options. Your team maintains the information on its existing website, keeping the physical invitation simple.", placement: "At reception or beside the concierge desk." },
      { productSlug: "google-review-stand", goal: "Make your property’s review page accessible", reason: "Let departing guests reach the correct hotel’s Google review destination. The stand offers the link without creating a review or promising a rating on the guest’s behalf.", placement: "At a clear, reachable spot beside checkout." },
      { productSlug: "tripadvisor-review-stand", goal: "Open your Tripadvisor property profile", reason: "Connect travelers to the public listing you already use. Confirm the property and available review actions from a guest’s phone before choosing this destination.", placement: "On the reception counter or guest departure desk." }
    ],
    placements: [
      { title: "Arrival and reception", body: "Use an information stand where guests wait during check-in. A short public guide can reduce the need to search for breakfast hours or facility information. Keep room-specific details, access codes, and individual reservations outside this public destination, and make sure guests can read the page comfortably on a phone." },
      { title: "Concierge and shared spaces", body: "Place a stand beside the desk where visitors ask about local transport or property amenities. Use a page your team can maintain at a stable address as details change. Keep the counter uncluttered so the invitation remains easy to understand alongside maps, luggage tags, and other printed information." },
      { title: "Departure counter", body: "A review stand belongs where guests finish their stay and can choose to share their experience. Offer it consistently rather than selecting only apparently satisfied guests. If you use more than one review platform, separate their purpose clearly instead of surrounding the payment area with competing requests." }
    ],
    steps: [
      { title: "Choose the guest moment", body: "Start with arrival information or departure reviews, depending on your property’s needs. Select a stand that describes that action. For a small guesthouse, one reception stand may be enough; a larger property can use separate destinations at different desks." },
      { title: "Prepare a public mobile destination", body: "Test the information page or property profile without a staff login. Check the property address and language of the destination. If you choose Branded, confirm the property name and logo in the preview before approving the design and completing payment." },
      { title: "Introduce the stand to reception staff", body: "Demonstrate a tap and, for a Branded stand, a QR scan from the guest side of the counter. Explain what the link opens so staff can help visitors. Include a destination check when your team updates seasonal facility hours or property information." }
    ],
    faqs: [
      { question: "Can the stand replace a printed guest information booklet?", answer: "It can link to a public digital guide containing the information you choose to publish. The guide itself lives on your website or existing provider. Keep essential instructions available through your usual guest channels as well, and avoid publishing private room or reservation details through a publicly accessible stand." },
      { question: "Can overseas guests use the same stand?", answer: "The stand opens your destination on their phone. NFC requires a compatible device; a Branded stand also provides a printed QR code. Language, connectivity, and any account requirements depend on the guest’s device and destination website. Consider a mobile page with clear language choices if your property serves international travelers." },
      { question: "Should I link to Google or Tripadvisor?", answer: "Use the public property profile that supports your guest communication strategy and that your team actively maintains. Verify the exact listing rather than a search results page. A stand does not bypass a platform’s review eligibility or sign-in requirements, and guests still decide whether to share their experience." },
      { question: "Can several properties share the same stand design?", answer: "You can use consistent branding while configuring different destination links for each property. Check every address and profile before ordering. Keep the stands organized by property during installation, particularly when the designs look similar, so guests do not reach information or a review page for another location." },
      { question: "Is hotel information hosting included with the stand?", answer: "A direct stand opens one link you supply and does not include a new hotel website or booking system. Optional hosted Multi-Link provides an editable page with several destinations for a separate monthly charge. Your existing website and reservation services remain responsible for their own content and operations." }
    ]
  },
  "healthcare-dental": {
    headline: "NFC & QR Stands for Dental & Healthcare Practices",
    seoTitle: "NFC & QR Stands for Dental & Healthcare Practices",
    seoDescription: "Connect visitors to patient resources, practice information, and service pages. Explore healthcare NFC stands, Branded + QR designs, and reception placement tips.",
    introduction: "Help visitors find your practice’s public information without searching through similar clinic names. Tap Rater stands open an existing patient resource page, service overview, or practice website from a reception counter. Choose a destination that answers routine questions and is appropriate for anyone in the waiting room to access. Standard offers NFC tapping; Branded adds the practice name, logo, and a printed QR code. Your existing systems continue to handle appointments, records, and private communication.",
    recommendationsTitle: "Recommended Stands for Practices and Clinics",
    placementTitle: "Where to Place Stands in Your Practice",
    howItWorksTitle: "How Your Practice Stand Works",
    faqTitle: "Healthcare and Dental Stand FAQs",
    recommendations: [
      { productSlug: "patient-resources-stand", goal: "Make public patient resources easier to find", reason: "Open your practice’s general resource page with preparation information or useful public links. Choose material intended for all visitors rather than a document tied to a particular patient.", placement: "At reception, where staff can explain the destination." },
      { productSlug: "check-our-information-stand", goal: "Share location and contact information", reason: "Point visitors to the correct office’s hours, directions, accessibility information, and contact options. This is especially helpful when your organization operates several similar-looking practice websites.", placement: "Near the reception exit or information desk." },
      { productSlug: "explore-our-services-stand", goal: "Introduce the services your practice offers", reason: "Let visitors browse the service information your practice has already published. The stand supplies access to that page; it does not provide clinical guidance or assess an individual’s care needs.", placement: "In a quiet, reachable part of the waiting area." }
    ],
    placements: [
      { title: "Reception counter", body: "Set the resource stand where visitors can approach it without leaning across reception equipment. Staff should know whether it opens preparation information, a practice overview, or another public page. Keep the invitation distinct from check-in instructions so visitors do not assume tapping the stand registers them for an appointment." },
      { title: "Waiting area", body: "Use a service information stand where people have time to read on their own phones. Select a page with clear explanations and readable text. Avoid placing it beside a display that could imply a specific treatment is recommended for everyone; the destination should remain general practice information." },
      { title: "Departure and information point", body: "A location information stand can help visitors save contact details or find directions for a future visit. Test the page for the specific office and keep its opening hours current. Leave printed information or staff assistance available for people who do not want to use a phone." }
    ],
    steps: [
      { title: "Select a public information task", body: "Choose a resource, location, or service page that your team is comfortable making available at reception. Match the stand wording to that destination. Check that it does not promise a function, such as check-in or appointment confirmation, that the linked page does not provide." },
      { title: "Review the destination with your team", body: "Open the page from a visitor’s perspective and verify the practice name, office address, and mobile readability. Keep patient-specific links in your existing communication systems. Review the Branded design’s practice details before approval if you want a printed QR alongside NFC." },
      { title: "Test the visitor experience", body: "Try the stand from the public side of the desk and confirm that the destination opens correctly. Show reception staff how to describe the link. Recheck it whenever your practice changes websites, resource providers, locations, or the structure of its public information pages." }
    ],
    faqs: [
      { question: "Does the stand act as a patient portal?", answer: "No. A stand opens a destination URL; it is not a patient portal, clinical system, or medical record service. Your existing providers handle authentication and private information. For a shared reception stand, choose a public practice resource rather than a link containing an individual patient’s details or session information." },
      { question: "Can I link to appointment information?", answer: "You can link to your practice’s public appointment information or existing booking page. The destination provider handles availability, submissions, and confirmations. Make the stand’s purpose clear to visitors, and test the entire mobile journey before ordering so they understand whether they are reading information or making a request." },
      { question: "Which design works for a reception desk?", answer: "Standard provides a ready-made NFC design. Branded adds your practice name, logo, and printed QR code for visitors who prefer scanning. Choose the available option on the product page and place it where the invitation is visible. Staff assistance remains useful for visitors who do not use a compatible phone." },
      { question: "Can each clinic location have different resources?", answer: "Yes. Configure stands with the correct location’s destination, even when the practices share a brand. Check the address, phone number, and service information on each linked page. Keep a simple installation record so stands are not accidentally moved between offices with different resource or appointment links." },
      { question: "Do I need a new website or subscription?", answer: "You can use an existing public page with a direct stand, without a Tap Rater hosted subscription. Optional Multi-Link is available for several destinations on one editable page with a separate monthly charge. It does not replace your practice website, booking provider, or systems used for private patient communication." }
    ]
  },
  "home-services": {
    headline: "NFC & QR Stands for Contractors & Home Services",
    seoTitle: "NFC & QR Stands for Contractors & Home Services",
    seoDescription: "Help homeowners explore your services, find business information, and open Google reviews. Compare NFC stands for showrooms, trade events, and service counters.",
    introduction: "Turn a showroom conversation or trade event visit into a clear next step for homeowners. Tap Rater stands connect your physical display to your existing service information, project pages, or Google review destination. Choose a public link that explains what you do and the areas you serve, then place it where customers already stop to ask questions. Standard stands use NFC; Branded designs add your business name, logo, and printed QR code for a scan option.",
    recommendationsTitle: "Recommended Stands for Home Service Businesses",
    placementTitle: "Where Contractors Can Use NFC Stands",
    howItWorksTitle: "How Your Home Services Stand Works",
    faqTitle: "Contractor and Home Services Stand FAQs",
    recommendations: [
      { productSlug: "explore-our-services-stand", goal: "Show homeowners what you offer", reason: "Open your public service page with the work you undertake, service areas, and next-step information. Let prospects browse the details after a conversation instead of relying on a remembered business name.", placement: "At a showroom consultation table or exhibition booth." },
      { productSlug: "google-review-stand", goal: "Connect customers to your Google review page", reason: "Make your business’s review destination available after a completed customer interaction. Use the profile that represents your company and leave the choice of rating and comments with the customer.", placement: "At a reception or completed-project handover desk." },
      { productSlug: "check-our-information-stand", goal: "Share contact and project information", reason: "Send visitors to a stable page containing your public contact details, opening hours, or project gallery. Keep customer-specific quotes and private project documents in your usual communication channels.", placement: "Beside samples, brochures, or a service counter." }
    ],
    placements: [
      { title: "Showroom consultation tables", body: "Place a service stand beside the samples or displays customers are discussing. Choose a page that helps them understand the next step, such as an enquiry form or service overview. Keep the stand accessible without covering material labels, measurements, or other information they need to compare their options." },
      { title: "Trade shows and local events", body: "Use a Branded stand at your booth if you want both NFC and a printed QR. Link to an enduring service page rather than a promotion that will disappear when the event ends. Test it using a phone connection similar to the one visitors will have at the venue." },
      { title: "Reception and handover desks", body: "A review or information stand can be useful where customers collect documents or finish a project discussion. Keep the invitation separate from invoices and warranty decisions. If your team has no fixed customer-facing desk, consider where a tabletop stand will actually be used before ordering several units." }
    ],
    steps: [
      { title: "Choose one homeowner action", body: "Decide whether visitors need a service overview, project information, or your review destination. Match the stand to that purpose and the place it will sit. Start with the location that receives the most relevant in-person questions rather than duplicating every digital channel." },
      { title: "Prepare the right public page", body: "Check that your destination describes your service area and provides a clear way to contact the business. Test it without being signed into your website editor. For Branded designs, confirm the company name and logo in the preview before approving the order." },
      { title: "Demonstrate it during conversations", body: "Show your team what opens when a customer taps or scans. Keep the stand facing visitors, with room for a phone to approach it. Review the destination after a website redesign or service-area change so an old link does not interrupt a promising enquiry." }
    ],
    faqs: [
      { question: "Can the stand open a quote request form?", answer: "An information or service stand can point to your existing public enquiry page. Your website or form provider handles the submission and follow-up. Choose a general form intended for new enquiries, rather than a private estimate or a link containing a previous customer’s project details or personal information." },
      { question: "Is it useful for a contractor without a showroom?", answer: "It can be useful at trade shows, consultation venues, or another stable tabletop setting where you meet customers. Think about the physical placement first. A stand needs a visible, reachable surface; it is not a substitute for every contact method used by technicians working across different homes." },
      { question: "Can I show a portfolio of completed projects?", answer: "Yes. Link to a public gallery or portfolio page you maintain, using images and project details you have permission to publish. Your website controls the gallery and its updates. Keep the destination focused enough that homeowners can understand your services without navigating through unrelated pages on a small screen." },
      { question: "Will the stand create Google reviews automatically?", answer: "No. It provides access to the review destination for your business. Customers decide whether to sign in, write a review, or leave a rating. The stand does not guarantee reviews, ratings, or enquiries, and should not be used to offer rewards in exchange for a particular response." },
      { question: "Can my service links change without new printed copy?", answer: "Content at the same destination URL can be maintained through your website. A direct stand opens the link configured for it, so changing the actual address is a separate consideration. If you regularly need several editable destinations, compare optional hosted Multi-Link and its monthly charge before choosing your setup." }
    ]
  },
  legal: {
    headline: "NFC & QR Stands for Law Firms & Legal Offices",
    seoTitle: "NFC & QR Stands for Law Firms & Legal Offices",
    seoDescription: "Share public firm information, practice areas, and professional profiles from reception. Explore law office NFC stands, Branded + QR designs, and setup guidance.",
    introduction: "Give visitors a straightforward way to find your firm’s public information while they are at reception or meeting your team at an event. Tap Rater stands open an existing website, practice-area overview, or professional profile from a phone. Choose a destination that is appropriate for general visitors and clearly identifies the office they are visiting. Standard offers NFC; Branded adds your firm name, logo, and a printed QR code. Private client communication stays with your existing systems.",
    recommendationsTitle: "Recommended Stands for Law Firms",
    placementTitle: "Where to Place Stands in a Legal Office",
    howItWorksTitle: "How Your Law Office Stand Works",
    faqTitle: "Law Firm Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Share public office information", reason: "Open a page with your office address, contact details, and visitor information. Choose a firm-controlled destination that makes it easy to identify the right branch and understand the next available step.", placement: "At reception or the visitor information desk." },
      { productSlug: "explore-our-services-stand", goal: "Introduce your practice areas", reason: "Help visitors find the public descriptions your firm has prepared for its services. The stand opens the page; it does not provide legal advice, assess a matter, or establish a professional relationship.", placement: "In a reception waiting area or public event display." },
      { productSlug: "linkedin-follow-stand", goal: "Connect visitors with your professional profile", reason: "Direct event attendees and professional contacts to the firm’s LinkedIn page. Use the public profile your team keeps current so the stand supports the introduction already taking place in person.", placement: "On a networking table or seminar registration desk." }
    ],
    placements: [
      { title: "Reception desk", body: "Place the information stand where a visitor can access it without crossing into staff workspace. Use a public office page rather than a client-specific document. Make the invitation distinct from reception sign-in, so visitors understand that opening the link does not notify staff that they have arrived." },
      { title: "Waiting and consultation areas", body: "A practice-area overview can give visitors background on the firm before a conversation. Keep the linked content general and maintained by your team. Avoid putting confidential matter details or personalized advice behind a link displayed on a stand that other visitors could access." },
      { title: "Seminars and professional events", body: "Use a profile stand where attendees collect information or speak with your team. Confirm whether the link should represent the firm or a specific professional before ordering. A clear business identity is useful when several organizations share a venue and visitors later revisit the page from their phones." }
    ],
    steps: [
      { title: "Define the public destination", body: "Choose office information, practice areas, or a professional profile according to the setting. Use wording that accurately describes what opens. Keep this page separate from any process your firm uses for confidential intake, engagement decisions, or individual client communication." },
      { title: "Review the link and design", body: "Ask the person responsible for your public website to confirm the destination and office details. Test the page without a staff login. If ordering Branded, review the firm name and approved logo in the preview before completing the design approval and payment steps." },
      { title: "Check the reception experience", body: "Test NFC and any included QR code from the visitor side of the counter. Explain the destination to reception staff so they can describe it accurately. Revisit the link when the firm changes offices, public profiles, or its website navigation." }
    ],
    faqs: [
      { question: "Can visitors send confidential documents through the stand?", answer: "The stand itself does not collect or protect documents; it opens the destination you supply. Use your firm’s established systems for confidential communication. A public reception stand is best linked to general information, with any private intake or document-handling process reviewed and managed by your existing providers and team." },
      { question: "Can the stand link to a consultation booking page?", answer: "You can choose a public information page that includes your existing consultation booking process. The scheduling provider handles available times and submitted details. Ensure visitors understand what a booking request means and test the destination carefully; tapping a stand alone does not confirm a meeting or create an engagement." },
      { question: "Should the link represent an attorney or the whole firm?", answer: "Match the link to the stand’s location and purpose. A shared reception counter usually needs firm or office information, while a professional event may call for an individual public profile. Confirm the intended identity in the design and destination so visitors are not surprised by the page they reach." },
      { question: "Can multiple offices use consistent branding?", answer: "Yes. Branded designs can use the firm’s identity while individual stands open different office destinations. Check each branch address and public contact information before ordering. Keep an installation record when distributing similar-looking stands, especially if the offices have separate websites, scheduling links, or professional directory pages." },
      { question: "What ongoing service does a direct stand require?", answer: "A direct stand opens one supplied URL without a Tap Rater hosted subscription. Your firm still maintains the destination page and any services behind it. Optional hosted Multi-Link offers several editable destinations for a separate monthly charge; it is a link page, not a legal practice management or client portal system." }
    ]
  },
  "real-estate": {
    headline: "NFC & QR Stands for Real Estate Agents & Open Houses",
    seoTitle: "NFC & QR Stands for Real Estate Agents & Open Houses",
    seoDescription: "Connect open house visitors to property information, agent profiles, and Instagram. Compare real estate NFC stands, Branded + QR options, and placement ideas.",
    introduction: "Help open house visitors and office guests find the property information they want to take away. Tap Rater stands connect a tabletop display to your existing public property page, agent profile, or social account. Choose a destination that stays useful after the conversation ends, and make sure the stand’s identity matches the agent or office hosting the visit. Standard supports NFC tapping; Branded adds your name, logo, and printed QR so visitors can also scan.",
    recommendationsTitle: "Recommended Stands for Real Estate Professionals",
    placementTitle: "Where to Place Real Estate Stands",
    howItWorksTitle: "How Your Real Estate Stand Works",
    faqTitle: "Real Estate Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Share public property and office information", reason: "Open a property overview or agent website that visitors can revisit after a tour. Use a stable public destination and keep the available listing information current through your existing website.", placement: "On the welcome table at an open house." },
      { productSlug: "zillow-review-stand", goal: "Open your Zillow professional profile", reason: "Give visitors a route to the profile you already maintain. Verify that the supplied URL identifies the right professional or business and shows the public information you intend to share.", placement: "At your office reception or client meeting table." },
      { productSlug: "instagram-follow-stand", goal: "Help visitors follow your property updates", reason: "Connect guests to your public Instagram profile for listings, neighborhood features, and updates your team publishes. The stand opens the account; visitors decide whether to follow.", placement: "Beside brochures or a clearly identified agent display." }
    ],
    placements: [
      { title: "Open house welcome table", body: "Place an information stand beside the material visitors receive at arrival. Link to a mobile property page with the details you are authorized to publish. Keep the stand separate from any registration process so visitors understand that opening a page does not automatically sign them into the event." },
      { title: "Agency reception", body: "Use a professional profile or office information stand where visitors wait to meet your team. Check that the destination represents the appropriate agent or branch. In a shared office, avoid an unlabeled stand that could send every visitor to one individual’s page regardless of their appointment." },
      { title: "Property displays and local events", body: "A social stand can connect a conversation about the neighborhood to your public updates. Use a stable profile rather than a single short-lived post. If the stand travels between properties, review the destination and signage before each event so it does not imply outdated listing information." }
    ],
    steps: [
      { title: "Choose a lasting visitor destination", body: "Decide whether the stand should open one property, your broader website, or a professional profile. Consider how long the destination will remain useful. A stable listings page may suit a stand used repeatedly, while a property-specific URL needs careful management as the listing changes." },
      { title: "Confirm identity and content", body: "Test the public link on a phone and confirm the agent, office, and property details. Check that photos and descriptions are appropriate to share. For a Branded design, review the business name and logo so the physical stand and online destination clearly belong together." },
      { title: "Test before every event", body: "Set up the stand where a visitor can reach it without moving brochures or other materials. Try NFC and the printed QR if included. Make the link check part of your open house preparation, especially when you change properties or update a website’s listing addresses." }
    ],
    faqs: [
      { question: "Can I use the same stand at different open houses?", answer: "A direct stand opens its configured URL, so a stable page on your website can be useful across events when you maintain the content there. Do not assume a new property address automatically changes the stand’s link. Plan the destination before ordering and review it each time the stand moves." },
      { question: "Does tapping the stand register a lead?", answer: "Opening a link does not automatically register a visitor or submit contact details. If your destination includes a form, your existing website or form provider manages that process. Make the purpose of any sign-up clear and keep the stand’s wording consistent with what a visitor actually sees." },
      { question: "Can visitors open a listing without following my social account?", answer: "Yes, if the stand points directly to a public property or website page that allows it. A social profile may have different viewing or sign-in requirements. Choose a destination based on the information visitors need, and test it from a phone that is not signed into your own accounts." },
      { question: "Which design suits an open house?", answer: "Branded + QR offers your identity with both NFC and a printed scanning option, which can be useful for visitors approaching a welcome table. Standard is NFC-only. Check the product’s available options and place the stand within reach rather than expecting guests to interact with it from across a room." },
      { question: "Can one stand offer listings, contact details, and social links?", answer: "Optional hosted Multi-Link provides several destinations on an editable page for a separate monthly charge. A direct stand instead opens one supplied URL, which could be your existing website. Compare the two approaches based on who maintains your links and how often your open house information changes." }
    ]
  },
  "beauty-salon-wellness": {
    headline: "NFC & QR Stands for Salons, Spas & Beauty Businesses",
    seoTitle: "NFC & QR Stands for Salons, Spas & Beauty Businesses",
    seoDescription: "Help salon clients explore services, discover your Instagram portfolio, and find Google reviews. Compare NFC stands, Branded + QR designs, and reception tips.",
    introduction: "Keep the connection going after an appointment at your salon, spa, barbershop, or beauty studio. Tap Rater stands open your existing service page, Instagram profile, or Google review destination from a reception desk. Give each stand a clear role so clients know whether they are browsing treatments, viewing your work, or sharing their experience. Standard designs offer NFC; Branded adds your business identity and a printed QR code for clients who prefer scanning with their phone.",
    recommendationsTitle: "Recommended Stands for Salons and Beauty Studios",
    placementTitle: "Where to Place Stands in Your Salon or Spa",
    howItWorksTitle: "How Your Salon Stand Works",
    faqTitle: "Salon, Spa, and Beauty Stand FAQs",
    recommendations: [
      { productSlug: "instagram-follow-stand", goal: "Share your latest work and inspiration", reason: "Open your public Instagram portfolio so clients can explore styles and updates after their visit. Use a profile your team actively maintains and show work you have permission to share.", placement: "At checkout or beside the retail product display." },
      { productSlug: "explore-our-services-stand", goal: "Make your service information easy to browse", reason: "Link to your existing service menu with descriptions, prices, or a route to booking. Your website or booking provider remains responsible for availability and appointment confirmations.", placement: "At reception or in the waiting area." },
      { productSlug: "google-review-stand", goal: "Open your salon’s Google review destination", reason: "Give clients a convenient way to find the correct location’s review page. Leave the timing, wording, and rating up to them rather than making feedback part of a discount or reward.", placement: "Beside checkout after the appointment is complete." }
    ],
    placements: [
      { title: "Reception and waiting area", body: "Place the service information stand where clients can read while waiting without interrupting the receptionist. Link to a menu that explains the services currently offered at that location. If different team members have separate booking pages, make the choices clear on the destination before asking clients to select one." },
      { title: "Checkout counter", body: "A review stand can sit near the point where an appointment ends, with enough space for a phone to reach it. Keep it distinct from payment and tipping instructions. Offer the option to clients consistently and let them decide whether they want to share an experience after leaving." },
      { title: "Retail display or portfolio area", body: "Use an Instagram stand near products or examples of your work where clients naturally pause. Keep it away from wet surfaces and busy treatment workspaces. A clear public portfolio gives visitors something relevant to browse without placing several different social invitations around the same small counter." }
    ],
    steps: [
      { title: "Choose the client action", body: "Pick service browsing, social connection, or reviews as the first use. Match the product to the point in the visit where that action makes sense. One well-placed stand can be easier for staff to explain than a collection of unrelated links at reception." },
      { title: "Check the salon and provider details", body: "Open the destination as a client would and verify the location, service menu, and public profile. If booking is available, confirm that it leads to the right team or provider. Review your logo and business name in the Branded design preview before approval." },
      { title: "Make the stand part of reception setup", body: "Test a tap and any included QR scan from the client side of the desk. Show staff which page opens and how to describe it briefly. Recheck the destination when your booking provider, team structure, service menu, or social profile address changes." }
    ],
    faqs: [
      { question: "Can clients book their next appointment from a stand?", answer: "A service page can include a link to your existing booking provider. The provider handles available times, deposits, cancellations, and confirmations; the stand does not manage those functions. Choose a destination that clearly identifies the salon location and service provider so clients can take the next step without guessing." },
      { question: "Can separate stylists use different destinations?", answer: "Yes. You can configure stands for different public profiles or service pages. Decide whether a shared reception stand should represent the whole salon or a specific provider. Use clear branding and placement, and check the destination whenever a team member’s booking address or public profile changes." },
      { question: "Should I choose Instagram or a Google Review stand first?", answer: "Choose based on the conversation you want to support. Instagram suits showing your portfolio and keeping clients connected with updates. Google suits making the review destination accessible after a visit. Neither action happens automatically; clients decide whether to follow, sign in, or submit feedback when the page opens." },
      { question: "Can the stand match my salon branding?", answer: "Choose Branded where available to add your business name, logo, and a printed QR code alongside NFC. Review the design preview before payment to confirm the details. Standard offers a ready-made NFC-only design. Current options and prices appear on the product page so you can compare them before ordering." },
      { question: "Can I combine my service menu and social profiles?", answer: "You can link directly to an existing website that already offers those choices, or compare optional hosted Multi-Link for an editable page with several destinations. Multi-Link has a separate monthly charge. Your booking platform continues to handle appointments, while the stand and link page help clients reach it." }
    ]
  },
  "ecommerce-online-brand": {
    headline: "NFC & QR Stands for Online Brands & Pop-Up Shops",
    seoTitle: "NFC & QR Stands for Online Brands & Pop-Up Shops",
    seoDescription: "Bring your online brand to markets and pop-ups with NFC stands for store information, Instagram, and TikTok. Compare Branded + QR options and event setup tips.",
    introduction: "Connect an in-person product discovery with the online brand you have built. Tap Rater stands help shoppers at pop-ups, markets, and showrooms open your existing store information or social profiles on their phones. Choose a destination they can revisit after the event, rather than making them remember an account name. Standard uses NFC tapping; Branded adds your logo, business name, and printed QR code. Your ecommerce platform continues to manage shopping, payments, shipping, and customer accounts.",
    recommendationsTitle: "Recommended Stands for Online Brands",
    placementTitle: "Where to Place Stands at Pop-Ups and Markets",
    howItWorksTitle: "How Your Brand’s NFC Stand Works",
    faqTitle: "Online Brand and Pop-Up Stand FAQs",
    recommendations: [
      { productSlug: "check-our-information-stand", goal: "Open your brand’s public store information", reason: "Send shoppers to a useful website page with product information, store links, or care guidance. Choose a stable destination that remains helpful when the event is over.", placement: "Beside your main product display or information table." },
      { productSlug: "instagram-follow-stand", goal: "Connect visitors to your Instagram brand page", reason: "Give shoppers a route to product photography, launches, and updates you publish. This supports an ongoing connection without requiring visitors to search through similarly named accounts.", placement: "At the checkout or packing counter." },
      { productSlug: "tiktok-follow-stand", goal: "Share your demonstrations and brand stories", reason: "Open the TikTok profile where you publish product videos or behind-the-scenes content. Check how the public profile appears on a phone before using it as the event destination.", placement: "Near a product demonstration or discovery display." }
    ],
    placements: [
      { title: "Product discovery table", body: "Place the information stand beside a small group of products rather than burying it among price tags. Link to a relevant page that helps shoppers understand the range. Keep the destination broad enough to stay useful when individual products sell out or your event stock differs from online availability." },
      { title: "Checkout and packing station", body: "A social stand can give customers something useful to open while an order is being packed. Keep it separate from payment instructions so nobody mistakes a profile link for a checkout step. Position it on the customer side, leaving room for bags, receipts, and other purchases." },
      { title: "Demonstration area", body: "A video profile can extend a product demonstration beyond the booth. Make the stand’s purpose clear and test the destination on the venue’s available connection. Your physical display should still explain the product for visitors who cannot open the page or do not use that social platform." }
    ],
    steps: [
      { title: "Choose what happens after discovery", body: "Decide whether visitors should explore your website or find a social profile. Choose the stand that matches that next step. Avoid a destination tied to one shopping cart or a temporary session; the same public link should work for different visitors throughout the event." },
      { title: "Review the mobile brand experience", body: "Test your link on a phone without using a store administrator login. Confirm the brand name, page loading, and navigation back to relevant products. If you choose Branded, approve the business details and logo in the design preview before payment." },
      { title: "Include a link test in event setup", body: "After arranging the display, try the stand from the shopper’s side of the table. Check NFC and the printed QR if included. Make sure staff know the destination and recheck it before the next pop-up, especially after a store redesign or social account change." }
    ],
    faqs: [
      { question: "Does Tap Rater process online orders from the stand?", answer: "No. The stand opens your supplied destination, and your ecommerce platform handles products, carts, payments, shipping, and customer accounts. Choose a public store or information page that works for new visitors. A stand is a way to reach that experience, not a replacement for your online checkout." },
      { question: "Can shoppers use the link after the pop-up ends?", answer: "They can revisit a public page through their browser history or other ways they save it. Choose a destination you intend to maintain after the event, such as your main store information or social profile. Avoid building the experience around a temporary promotion that will leave visitors at an expired page." },
      { question: "Can one stand connect to multiple social channels?", answer: "A direct stand opens one destination. If you want to offer several channels and a store link together, you can use an existing page on your own website or optional hosted Multi-Link for a separate monthly charge. Pick the approach that fits how your team maintains its campaign and store links." },
      { question: "Will tapping automatically subscribe someone to updates?", answer: "No. Opening a website or social profile does not automatically subscribe a visitor or submit their contact information. Any newsletter form belongs to your existing provider, and a social follow is the visitor’s choice. Describe the destination clearly rather than implying that tapping completes a sign-up." },
      { question: "Which design should I take to a market?", answer: "Branded + QR gives shoppers both a tap and a camera-scan option while displaying your business identity. Standard is NFC-only. Compare available designs on the product page and plan for a reachable tabletop position. Check the venue connection before relying on any online destination as your only source of product information." }
    ]
  },
  "retail-local-business": {
    headline: "NFC & QR Stands for Retail Stores & Local Shops",
    seoTitle: "NFC & QR Stands for Retail Stores & Local Shops",
    seoDescription: "Help shoppers find Google reviews, store information, and Instagram updates. Explore retail NFC stands, Branded + QR designs, and practical checkout placement tips.",
    introduction: "Make your shop’s online information easy to reach while customers are already at the counter. Tap Rater stands open your store’s review page, public information, or social profile with a phone. Choose one clear action for each setting, from service questions at a help desk to updates at checkout. Standard stands provide NFC tapping; Branded adds your store name, logo, and a printed QR code. Your existing website and systems remain responsible for sales and customer services.",
    recommendationsTitle: "Recommended Stands for Retail and Local Businesses",
    placementTitle: "Where to Place Stands in Your Shop",
    howItWorksTitle: "How Your Retail Stand Works",
    faqTitle: "Retail and Local Business Stand FAQs",
    recommendations: [
      { productSlug: "google-review-stand", goal: "Make your store’s Google review page easy to find", reason: "Offer shoppers a route to the review destination for the branch they visited. Keep feedback optional and separate from discounts, returns decisions, or any request for a particular rating.", placement: "Beside checkout, clear of the payment terminal." },
      { productSlug: "check-our-information-stand", goal: "Answer routine store information questions", reason: "Link to a public page with hours, contact details, services, or collection information. Keep those details up to date on your existing website so shoppers can revisit them later.", placement: "At the service counter or collection desk." },
      { productSlug: "instagram-follow-stand", goal: "Share new arrivals and store updates", reason: "Open the Instagram profile you use for product launches and shop news. A visible account destination helps shoppers find the correct store without remembering its exact social handle.", placement: "Near a new-arrivals display or packing area." }
    ],
    placements: [
      { title: "Checkout counter", body: "Place a review stand where customers can see it after their purchase, without crowding the payment area. Leave room for bags and a phone to approach the stand. Staff can explain the destination briefly, but shoppers should be free to decide whether and when to share feedback." },
      { title: "Service and collection desks", body: "An information stand can point to store hours, collection instructions, or a public service page. Keep it separate from any private order lookup process. Use content that applies to general visitors rather than a link containing one shopper’s receipt, tracking details, or personal account information." },
      { title: "Seasonal and new-arrivals displays", body: "Use a social stand where shoppers pause to explore a collection. A stable store profile can remain useful as the display changes. Keep the stand visible among signs and price labels, and avoid placing it where reaching for a phone could disturb fragile products or block another customer’s path." }
    ],
    steps: [
      { title: "Match the stand to the counter", body: "Choose reviews for a completed visit, information for a service desk, or a social profile for product discovery. Start with one clear invitation. If you have multiple checkout lanes, decide whether each needs the same destination or a different customer action." },
      { title: "Verify the store location", body: "Open the link as a shopper and check the branch name, address, and public information. Test how it works without a staff account. Review your store identity in the Branded preview if you want a logo and printed QR alongside the NFC option." },
      { title: "Keep the display and link current", body: "Try the finished stand from the customer side of the counter and demonstrate it to the team. Recheck the destination when opening hours, website addresses, or social handles change. A brief link check during a seasonal display refresh helps keep the experience understandable." }
    ],
    faqs: [
      { question: "Can each store branch open a different review page?", answer: "Yes. Configure each stand with the destination for the correct location, then verify the name and address shown on the page. Keep stands organized by branch when distributing them. Similar branding does not mean the links are interchangeable, particularly when individual shops have separate Google profiles or public service pages." },
      { question: "Can I use a stand for collection or returns information?", answer: "An information stand can open a public page explaining your store’s processes. Your own systems and staff continue to handle individual orders, refunds, and returns. Avoid using a customer-specific order link as the shared destination, and make clear whether the page provides instructions or offers an actual service request form." },
      { question: "Does a Google Review stand guarantee more positive ratings?", answer: "No. It makes the review destination easier to reach, but customers decide whether to leave a review and what rating to give. Offer the option consistently and do not tie it to rewards or a favorable outcome. The platform may also require the shopper to sign in before submitting." },
      { question: "Can shoppers scan instead of using NFC?", answer: "Branded + QR includes a printed QR code as well as NFC, while Standard uses NFC only. Choose an available design on the product page based on the experience you want at the counter. Position the stand within comfortable reach and let customers choose the connection method their phone supports." },
      { question: "Can a stand show several store links at once?", answer: "A direct stand opens one URL, such as your existing store information page. Optional hosted Multi-Link offers an editable page with several destinations for a separate monthly charge. It can provide choices for store information and social profiles, while your existing ecommerce or service providers handle any transactions behind those links." }
    ]
  }
};
