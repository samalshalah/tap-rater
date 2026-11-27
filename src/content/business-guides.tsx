import type { ReactNode } from "react";
import Link from "next/link";

export type GuideSection = { id: string; title: string; content: ReactNode };
export type GuideContent = {
  answer: string;
  sections: GuideSection[];
  faqs: { question: string; answer: string }[];
  sources: { href: string; label: string }[];
};

const reviewLinkHelp = { href: "https://support.google.com/business/answer/16816815", label: "Google: create a review link or QR code" };
const reviewPolicy = { href: "https://support.google.com/contributionpolicy/answer/7400114", label: "Google Maps contribution policy" };

export const businessGuideContent: Record<string, GuideContent> = {
  "google-review-link-qr-code": {
    answer: "Open the Google Business Profile you manage, select Read reviews, then Get more reviews. Copy the review link or save the QR code shown there. Before sharing either, test it on a phone and confirm that it opens the correct business and location.",
    sections: [
      { id: "find-your-link", title: "Find the review link for the right location", content: <>
        <p>Your review link should help a customer reach the place where they can write about your business. A website address, a search-results link, and a Google review link serve different purposes. Copy the link from your managed Business Profile so you start with the intended review destination.</p>
        <ol>
          <li>Sign in to the Google account that manages your business and open your <a href="https://business.google.com/">Google Business Profile</a>.</li>
          <li>If you manage several locations, choose the location where this customer was served. Check its business name and address.</li>
          <li>Select <strong>Read reviews</strong>, followed by <strong>Get more reviews</strong>.</li>
          <li>Use the copy option to save the review link. Keep it in a location record that your staff can recognize.</li>
        </ol>
        <p>For example, label your saved record “Downtown salon — Google review link” rather than simply “Google.” Include the street address in your internal notes. This small step helps prevent the wrong link being reused in an email, receipt, or second branch.</p>
        <p>If you cannot find the controls, first check which Google account and Business Profile you have open. The person who manages the profile may need to supply the link. Google’s <a href={reviewLinkHelp.href}>review-link instructions</a> describe the current desktop steps.</p>
      </> },
      { id: "save-qr-code", title: "Save the QR code or create one from your link", content: <>
        <p>The same sharing panel provides a QR code. On a computer, right-click it and choose <strong>Save image as</strong>. Save the original file with the location name, so the image and the link stay together.</p>
        <p>You can also encode the verified review link in a QR tool you already use. Choose a URL code, paste the complete link, and check the exported image. Review any service’s terms before relying on it for permanent printed material: a code that uses a provider’s redirect may depend on that service remaining available.</p>
        <p>Keep a clear border around the code, preserve its square shape, and use a sharp file. Do not stretch it to fill a narrow label or cover part of it with a logo. When a code sits inside a custom design, test the final artwork, not just the original image.</p>
        <p>You do not need to buy a stand to obtain a review link or share it digitally. The physical display is an optional way to make that link available at your counter.</p>
      </> },
      { id: "test-destination", title: "Test the customer journey before printing", content: <>
        <p>Open the copied link on a phone other than the one you normally use to manage the business. Then scan the saved QR code from a second screen or printed proof. You are checking both the destination and how easily someone can reach it.</p>
        <ul>
          <li><strong>Business:</strong> Does the name and location match the visit?</li>
          <li><strong>Action:</strong> Can the customer reach the place to write a review?</li>
          <li><strong>Access:</strong> Does a sign-in prompt appear? Customers may need their own Google account.</li>
          <li><strong>Readability:</strong> Does the final printed code scan in the lighting and position where it will be used?</li>
        </ul>
        <p>Do not submit a review to test the link. Reaching the intended review form is enough. If a code opens the wrong branch, replace the source link and regenerate the artwork before you print it.</p>
        <p>If the code will not scan, try better light, clean the camera lens, and hold the phone far enough away to frame the whole square. Compare the downloaded file with the printed proof. A readable digital code and a failed print usually call for a print or layout check.</p>
      </> },
      { id: "share-link", title: "Share the link where it fits the visit", content: <>
        <p>Use a clickable link in an email or text. A QR code is useful on a counter, receipt, or other physical surface that a customer can scan with their phone. Keep the nearby wording clear about the destination: “Share your experience on Google” tells people what to expect.</p>
        <p>Make the invitation optional and use a channel the customer expects. For ready-to-adapt wording, see our <Link href="/guides/how-to-ask-for-google-reviews">six Google review request templates</Link>. For timing and a staff routine, see <Link href="/guides/get-more-google-reviews">how to get more Google reviews for your business</Link>.</p>
        <p>For multiple locations, test each location’s materials separately. Keep a simple record of the branch name, approved review link, QR filename, and date checked. Update that record whenever you change the profile or printed material.</p>
      </> },
      { id: "custom-stand", title: "Put the approved link on a custom stand", content: <>
        <p>A <Link href="/product/google-review-stand">custom Google review stand</Link> combines your logo, an NFC tap option, and a printed QR code. Both tap and scan should open the review destination you approve.</p>
        <p>Tap Rater’s acrylic display measures <strong>6.5 × 4.25 inches</strong>, with a 50 mm base. It is <strong>printed in the USA</strong> and includes <strong>free U.S. shipping</strong>. The Direct stand is a <strong>$49 one-time purchase with no required subscription</strong>. Preview your branding and review destination before approving the artwork and paying.</p>
        <p>Put the stand where the front is visible and customers have room to hold a phone. When it arrives, test its NFC area and QR code independently. A tap opens a link notification on a compatible phone; the customer still chooses whether to sign in and write a review.</p>
        <p>See the <Link href="/nfc-vs-qr-google-review-stand">NFC and QR comparison</Link> for the two ways to open a link, or browse the <Link href="/category/reviews">review stand collection</Link> to choose the platform your customers use.</p>
      </> }
    ],
    faqs: [
      { question: "Is a Google review link free?", answer: "Google provides a review link and QR code through your Business Profile. A paid stand or a separate QR service is not required to share that link." },
      { question: "Can one QR code collect reviews for several locations?", answer: "A direct QR code opens one destination. Use the review link for the location the customer visited, and keep each branch’s printed materials clearly labeled." },
      { question: "Will the QR code automatically submit a review?", answer: "No. It opens the destination. The customer may need to sign in to Google and chooses the rating, wording, and whether to submit." },
      { question: "What if my printed review link is wrong?", answer: "Stop using the incorrect material and check the destination. A direct QR code contains its original link; replacing the image in a computer file does not update a code that is already printed. Contact Tap Rater about a stand before making changes to its setup." }
    ],
    sources: [reviewLinkHelp]
  },
  "how-to-ask-for-google-reviews": {
    answer: "Thank the customer, invite an honest account of their visit, and provide the review link for the correct business location. Keep the request short and optional. Let the customer decide when to write and what to say.",
    sections: [
      { id: "correct-link", title: "Start with the correct Google review link", content: <>
        <p>Before writing the message, check where your link opens. A well-written invitation still creates confusion if it sends someone to a different branch or a general website page.</p>
        <p>Copy the review link from your managed Google Business Profile and test it on a phone. Our <Link href="/guides/google-review-link-qr-code">Google review link and QR code guide</Link> walks through the setup. Keep a separate, clearly labeled link for each location.</p>
      </> },
      { id: "request-templates", title: "Six review request templates you can adapt", content: <>
        <p>Replace the words in square brackets with your own details. Use a communication channel the customer expects, and keep the request about the visit they actually had.</p>
        <h3>1. A short invitation at checkout</h3>
        <blockquote>Thank you for visiting us. If you’d like to share your experience, this stand opens our Google review page. You can leave a review whenever it’s convenient.</blockquote>
        <p>Point out the stand once, then let the customer continue. There is no need to watch them use their phone or wait for a review before finishing the transaction.</p>
        <h3>2. An email after a completed visit</h3>
        <p><strong>Subject:</strong> Thank you for visiting [Business name]</p>
        <blockquote>Hi [First name],<br /><br />Thank you for choosing [Business name] for [visit or service]. If you’d like to share your experience, you can leave an honest Google review here: [Google review link].<br /><br />We appreciate your time.<br />[Your name]</blockquote>
        <p>Use a recognizable sender name. A customer should understand who is contacting them before opening the link.</p>
        <h3>3. A text message</h3>
        <blockquote>Hi [First name], this is [Name] from [Business name]. Thank you for visiting us. If you’d like to leave an honest Google review, here’s our link: [Google review link]. Thanks for your time.</blockquote>
        <p>Keep the request to one purpose. Use text only where the customer has agreed to receive this kind of message, and respect their communication preferences.</p>
        <h3>4. A salon follow-up</h3>
        <blockquote>Thank you for your visit to [Salon name]. If you’d like to share your experience with our salon, you can leave a Google review here: [Google review link]. We appreciate your feedback.</blockquote>
        <p>Send the message after the visit rather than interrupting the service. Let the customer describe what matters to them.</p>
        <h3>5. A restaurant receipt message</h3>
        <blockquote>Thank you for dining with us. Share your experience on Google whenever it’s convenient. Scan the code to open our review page.</blockquote>
        <p>Keep the code away from receipt folds and other printing. Test a real receipt, since a sharp image on a screen does not guarantee a readable print.</p>
        <h3>6. A request after a home service job</h3>
        <blockquote>Thank you for choosing [Business name]. Now that [service] is complete, you’re welcome to share your experience in a Google review: [Google review link]. Thank you for your time.</blockquote>
        <p>Wait until the work is complete and the customer has had a chance to experience the result. If the visit was only an estimate, make sure your wording reflects that.</p>
      </> },
      { id: "natural-moment", title: "Choose a natural moment", content: <>
        <p>For a shop or salon, the end of the visit is a useful point to make the review link available. For a longer service, wait until the work is complete. A stand at reception or checkout can remain available without staff repeating the request.</p>
        <p>Use a consistent approach for genuine customers. Avoid deciding who receives the link based on whether you expect a positive rating. If someone raises a problem, help with that problem and leave their choice to review independent of the resolution.</p>
        <p>Choose one person to keep the approved message and location link up to date. That makes it easier for a new staff member to use the right wording without creating their own rating request.</p>
      </> },
      { id: "honest-optional", title: "Keep the request honest and optional", content: <>
        <p>Google’s policy prohibits incentives for reviews, selectively soliciting positive reviews, pressuring people to review on the premises, and requesting particular review content. It also restricts staff review quotas. Ask for the customer’s own experience without rewards, a preferred rating, or a script for the review itself. Read the <a href={reviewPolicy.href}>Google Maps contribution policy</a>.</p>
        <p>“Share your experience” leaves the decision with the customer. Keep the transaction and the invitation separate: someone should be able to pay, collect their order, or leave the premises comfortably without responding.</p>
      </> },
      { id: "counter-display", title: "Make the link available on your counter", content: <>
        <p>A <Link href="/product/google-review-stand">custom Google review stand</Link> places your logo and review link together at checkout or reception. A compatible phone can tap the NFC area, or the customer can scan the printed QR code. Both open the destination you approve.</p>
        <p>Tap Rater’s acrylic stand measures <strong>6.5 × 4.25 inches</strong>, is <strong>printed in the USA</strong>, and includes <strong>free U.S. shipping</strong>. The Direct stand costs <strong>$49 once, with no subscription</strong>. Add your logo, check the location, and approve the artwork before payment.</p>
        <p>Position the stand with its front visible and enough space for a phone. Test both tap and scan yourself. For placement ideas, see the guides for <Link href="/google-review-stand-for/restaurants">restaurants</Link> and <Link href="/google-review-stand-for/salons">salons</Link>.</p>
      </> },
      { id: "check-process", title: "Check the process regularly", content: <>
        <p>Record when you introduce the request and where you place the stand. Check that the link still opens the right location, read incoming feedback, and note other marketing or operational changes. A change in review count alone does not show which action caused it.</p>
        <p>Use customer questions to improve the invitation. If people ask which business the link opens, make the name clearer. If they cannot reach the sign, move it. If the destination is wrong, correct it before continuing.</p>
        <p>For a simple weekly checklist that includes staff guidance, placement, and measurement, read <Link href="/guides/get-more-google-reviews">how to get more Google reviews for your business</Link>.</p>
      </> }
    ],
    faqs: [
      { question: "Does tapping the stand automatically leave a review?", answer: "No. Tapping or scanning opens the destination. The customer chooses whether to sign in, select a rating, and submit a review." },
      { question: "Do I need a paid stand to ask for Google reviews?", answer: "No. You can share your review link digitally or print a QR code. A custom stand adds an acrylic counter display, your branding, and an NFC tap option alongside QR." },
      { question: "Can I use one review link for several business locations?", answer: "Use the matching Google review link for each location. Several stands at the same location can point to that location’s review page." }
    ],
    sources: [reviewLinkHelp, reviewPolicy]
  },
  "get-more-google-reviews": {
    answer: "Make it easy for genuine customers to reach the correct review form, offer an optional invitation after the service, and keep the process consistent. Start with a tested review link, a visible counter display, and a short weekly check of what customers experience.",
    sections: [
      { id: "start-with-visit", title: "Start with the experience you want customers to describe", content: <>
        <p>A request works best as a natural part of a completed visit. Before adding signs or follow-up messages, look at the questions customers repeatedly ask: Was the wait clear? Did they understand the service? Could they find the right person for help?</p>
        <p>Use that feedback to improve the visit itself. A stand can remove the need to search for your business, but it cannot turn a confusing experience into a good one or guarantee a particular rating.</p>
        <p>Choose one location and one clear routine to start. For example, a salon can keep a review stand at the front desk and offer the same brief invitation when the appointment is complete. A café can make the link available near pickup without slowing the line.</p>
      </> },
      { id: "remove-link-friction", title: "Remove the extra search step", content: <>
        <p>Ask someone who does not manage your Business Profile to follow your existing review link. Confirm that they reach the correct business location and can find the review form. They do not need to submit a review for this check.</p>
        <p>If you have no direct review link yet, follow the <Link href="/guides/google-review-link-qr-code">Google review link and QR setup guide</Link>. Use that approved destination consistently in your emails, printed materials, and stand artwork.</p>
        <p>Keep separate links for different branches. If customers mention the wrong address or an unfamiliar business name, treat it as a destination problem to investigate before asking more people to use the link.</p>
      </> },
      { id: "choose-placement", title: "Put the invitation where a customer can use it", content: <>
        <p>Look at the counter from the customer’s side. Can they see the message without moving merchandise? Can they get their phone near the NFC area or frame the QR code? Is glare hiding part of the display?</p>
        <ul>
          <li><strong>Salon or barbershop:</strong> Place the stand near the end-of-visit checkout area, with room for a phone and personal belongings.</li>
          <li><strong>Restaurant or café:</strong> Try a visible checkout or pickup position that does not obstruct orders. Keep review and menu actions clearly labeled.</li>
          <li><strong>Reception desk:</strong> Make the stand easy to reach after the appointment, while leaving the desk useful for check-in.</li>
          <li><strong>Home service:</strong> A follow-up link may fit better than a display that stays at your office and never reaches customers.</li>
        </ul>
        <p>These are starting points to test in your own setting. See the <Link href="/google-review-stand-for/restaurants">restaurant</Link>, <Link href="/google-review-stand-for/salons">salon</Link>, and <Link href="/google-review-stand-for/dentists">dental reception</Link> guides for more placement detail.</p>
      </> },
      { id: "staff-routine", title: "Give staff one simple, optional invitation", content: <>
        <p>Staff should be able to explain what the stand does in one sentence: “If you’d like to share your experience, this opens our Google review page.” Then let the customer decide whether and when to use it.</p>
        <p>Train the action, not a rating target. Show staff how to identify the correct stand, explain tap or scan, and help if someone asks where the link goes. Do not ask them to watch customers post or obtain a certain number of reviews.</p>
        <p>Google prohibits incentives, selective positive-review requests, and pressure to review on-site. Keep the invitation available to genuine customers regardless of the rating you expect. See the <a href={reviewPolicy.href}>current contribution policy</a>.</p>
        <p>Use the <Link href="/guides/how-to-ask-for-google-reviews">review request templates</Link> for email, text, receipt, and service examples. Keep longer scripts there so your staff checklist stays short.</p>
      </> },
      { id: "first-month", title: "A practical first-month routine", content: <>
        <h3>Week 1: check the starting point</h3>
        <p>Record the location’s current review count, test the link, and note where the invitation appears. Choose one staff contact to own the setup. Correct broken links and unclear signs before making other changes.</p>
        <h3>Week 2: make the invitation consistent</h3>
        <p>Introduce the approved wording and place the stand where customers can reach it. Ask staff whether people understand the action. If customers repeatedly ask “What is this for?”, clarify the label or the brief explanation.</p>
        <h3>Week 3: remove a specific obstacle</h3>
        <p>Change one thing that you have observed: a blocked position, glare, a wrong location link, or an invitation made before the service is finished. Record the date and reason. Avoid changing several parts at once if you want to learn what helped.</p>
        <h3>Week 4: review results and feedback</h3>
        <p>Compare similar periods and read the feedback itself. Record changes in customer volume, promotions, holidays, and other outreach. Keep a useful routine even when the sample is too small to attribute a change to one action.</p>
      </> },
      { id: "measure", title: "Measure progress without guessing what caused it", content: <>
        <p>A basic worksheet can record the week, location, review count at the start and end, and any process changes. If you already track completed visits, include that count for context. A busier week can produce more reviews without a better request process.</p>
        <p>Read new reviews and respond where appropriate. Repeated feedback about wait time, communication, or a product can be more useful than the total alone. Assign someone to route service problems to the person who can address them.</p>
        <p>A direct NFC or QR link is not, by itself, a dashboard that attributes each submitted Google review to a scan. Avoid reporting “stand-generated reviews” unless you have evidence for that attribution. Track observed changes honestly.</p>
      </> },
      { id: "choose-custom", title: "Use a stand that looks like it belongs to your business", content: <>
        <p>Your logo helps connect the physical invitation with the business the customer just visited. The <Link href="/product/google-review-stand">Tap Rater custom Google review stand</Link> offers NFC and QR on a <strong>6.5 × 4.25-inch acrylic display</strong>, giving the branding and action room at the counter.</p>
        <p>It is <strong>printed in the USA</strong>, includes <strong>free U.S. shipping</strong>, and costs <strong>$49 once for the Direct stand, with no required subscription</strong>. You review the custom artwork and destination before payment.</p>
        <p>Choose the platform that fits the customer task from the <Link href="/category/reviews">review stand collection</Link>. A Google review invitation should lead clearly to Google; a request to follow your business belongs on a separately labeled <Link href="/product/instagram-follow-stand">Instagram follow stand</Link>.</p>
      </> }
    ],
    faqs: [
      { question: "How quickly will I get more Google reviews?", answer: "There is no fixed timeline or guaranteed increase. Results depend on customer volume, the experience, how consistently the invitation is offered, and whether customers choose to respond." },
      { question: "Can I ask only customers who seem happy?", answer: "Use a consistent invitation for genuine customers. Google prohibits selectively soliciting positive reviews. Helping an unhappy customer should not depend on whether they leave or change a review." },
      { question: "Will a review stand guarantee five-star ratings?", answer: "No. It makes a destination easier to reach. The customer chooses whether to review and what rating and wording reflect their experience." },
      { question: "Should I use NFC or a QR code?", answer: "A stand with both gives customers a choice. They can tap with a compatible NFC-enabled phone or scan the code. Test both methods at the actual counter." }
    ],
    sources: [reviewPolicy, reviewLinkHelp]
  },
  "instagram-qr-code-for-business": {
    answer: "Open your business’s Instagram profile and choose Share profile to find its profile card or QR code. Save or share the code using the options available in your app, then test it on another phone. The code opens your profile; visitors still choose whether to follow.",
    sections: [
      { id: "find-code", title: "Find your Instagram profile QR code", content: <>
        <p>First switch to the business account you want customers to visit. This matters if the same phone manages a personal account and several business profiles. Check the username before saving anything.</p>
        <ol>
          <li>Open Instagram and go to your profile using the profile picture.</li>
          <li>Choose <strong>Share profile</strong> near the profile information.</li>
          <li>Find the QR code on the profile card. If the card has two sides, switch to the side showing the code.</li>
          <li>Use the share or download option available in your version of the app. Keep the full square and its surrounding margin in the saved image.</li>
        </ol>
        <p>Instagram’s controls can vary by app version. If the option is missing, check that you are viewing your own profile and that the app is current. Consult <a href="https://help.instagram.com/925529167647849/">Instagram’s profile QR-code help</a> for the instructions available for your device.</p>
        <p>For a quick in-person exchange, showing the code on your phone may be enough. A printed sign or stand makes the same destination available while you serve customers.</p>
      </> },
      { id: "profile-link", title: "Use the correct profile link for your custom stand", content: <>
        <p>A custom Instagram stand needs the profile you want to open, not access to your account. Use your profile-sharing controls to copy its link, or verify the profile address in a browser. A typical address looks like <code>https://www.instagram.com/yourbusiness/</code>.</p>
        <p>Open the address and check the username, profile picture, and business information. Do not supply a password, account recovery code, or private message link as the destination.</p>
        <p>When personalizing a <Link href="/product/instagram-follow-stand">custom Instagram follow stand</Link>, check the destination alongside your logo and business name. The printed Instagram code and an NFC tag are different ways to open a link; neither can make someone follow automatically.</p>
        <p>If you change your username later, test every printed link again. A direct QR code contains its original address. Updating a file on your computer does not update an already printed stand.</p>
      </> },
      { id: "test-code", title: "Test the code before putting it on a counter", content: <>
        <p>Scan the saved code from another phone and confirm that the correct profile opens. Check the experience on a phone that is not signed in to your business account. Depending on the device and session, Instagram may open in the app, in a browser, or ask the visitor to sign in.</p>
        <ul>
          <li>Keep the code sharp, square, and clear of other artwork.</li>
          <li>Leave the surrounding blank margin intact.</li>
          <li>Test a printed proof in the actual light and viewing position.</li>
          <li>Put your handle near the invitation so customers can recognize or search for the account.</li>
          <li>For a stand with NFC, test the tap separately from the QR scan.</li>
        </ul>
        <p>If a print does not scan, compare it with the digital version. Glare, a cropped margin, a soft image, or a code squeezed into a small space can make the physical version harder to read. Fix the cause and test again before ordering more copies.</p>
      </> },
      { id: "reason-to-follow", title: "Give customers a useful reason to follow", content: <>
        <p>Reaching the profile is only one step. The customer should recognize your business and see something they want to hear about again. Use a clear logo, an accurate bio, and recent posts that match the promise made at the counter.</p>
        <p>Choose a reason you can keep delivering. These are sample invitations, not promises of follower growth:</p>
        <ul>
          <li><strong>Salon:</strong> “Follow us for recent styles and appointment updates.”</li>
          <li><strong>Café:</strong> “See this week’s specials on Instagram.”</li>
          <li><strong>Retail shop:</strong> “Follow for new arrivals and restocks.”</li>
          <li><strong>Market vendor:</strong> “Find our next market dates here.”</li>
        </ul>
        <p>Keep the account ready before making the invitation more prominent. If the latest posts do not reflect your opening hours, current products, or promised updates, improve those first. Meta’s <a href="https://www.facebook.com/business/learn/lessons/setting-up-instagram-business-account">business-account guide</a> explains the profile information available to businesses.</p>
      </> },
      { id: "place-stand", title: "Make the follow invitation part of the visit", content: <>
        <p>At a salon, a front-desk stand can support a brief invitation after the appointment. At a boutique, it can sit near checkout where new-arrival information is relevant. At a market stall, keep it visible without hiding the products people came to see.</p>
        <p>A useful staff line is: “We post our new arrivals here if you’d like to follow along.” Point out the stand, then continue the service. Give people room to make the choice on their own phone.</p>
        <p>Tap Rater’s custom Instagram stand measures <strong>6.5 × 4.25 inches</strong>, with your logo and a matching QR destination on an acrylic display. It is <strong>printed in the USA</strong> and includes <strong>free U.S. shipping</strong>. The Direct stand is <strong>$49 once with no required subscription</strong>, and you approve the artwork before payment.</p>
        <p>Use the <Link href="/product/instagram-follow-stand">Instagram follow stand</Link> for a clear Instagram invitation, or browse the <Link href="/category/social-media">social media stands</Link> for another platform. Keep a Google review request separate and clearly labeled; our <Link href="/guides/how-to-ask-for-google-reviews">review-request guide</Link> covers that different task.</p>
      </> },
      { id: "measure-following", title: "Check profile activity and real customer questions", content: <>
        <p>Record when the stand was introduced, where it is placed, and the wording staff use. Review the profile activity and follower information available to your account over comparable periods. Also note changes in posting, promotions, and customer traffic.</p>
        <p>An increase in followers does not prove that every new follower came from the stand. A direct printed code does not automatically provide scan attribution or connect a visit to a completed follow. Treat the numbers as context unless your measurement setup supports a more specific claim.</p>
        <p>Ask staff what customers find confusing. If people cannot recognize the account, improve the profile and nearby handle. If they reach the profile but do not see the content you promised, fix that mismatch. The goal is a useful ongoing connection with customers who choose to hear from you.</p>
      </> }
    ],
    faqs: [
      { question: "Is my Instagram QR code free?", answer: "Instagram’s built-in profile sharing code does not require buying a stand. A custom stand adds your branding and a physical display, with an NFC tap option alongside QR." },
      { question: "Does scanning automatically follow my account?", answer: "No. The code opens the profile. Visitors may need to sign in and must choose Follow themselves." },
      { question: "Can I use the same code at several locations?", answer: "Yes, if every location should send visitors to the same profile. Use distinct destinations when each location has its own Instagram account." },
      { question: "What if I change my Instagram username?", answer: "Check the destination of every printed code and NFC tag. A direct link may still contain the old username. Confirm the correct replacement with Tap Rater before changing a stand’s setup." }
    ],
    sources: [
      { href: "https://help.instagram.com/925529167647849/", label: "Instagram: find and customize your profile QR code" },
      { href: "https://www.facebook.com/business/learn/lessons/setting-up-instagram-business-account", label: "Meta: setting up an Instagram business account" }
    ]
  }
};
