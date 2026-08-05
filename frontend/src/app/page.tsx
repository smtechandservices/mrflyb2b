import { SearchForm } from '@/components/SearchForm';
import FlyerSection from '@/components/FlyerSection';
import { RipplesBackground } from '@/components/RipplesBackground';
import { BRAND } from '@/config/brand';

const WHY_US = [
  { num: '01', title: 'Transparent fares', body: 'No hidden fees, no surprise add-ons at checkout the price you search is the price you pay.' },
  { num: '02', title: 'Live availability', body: 'Fares and seat counts are pulled straight from the source, so what you see is what you get.' },
  { num: '03', title: 'Flexible passengers', body: 'Book for a single passenger or a group of nine clients of any size, adults and children, in a single search.' },
  { num: '04', title: 'Real support', body: 'A team that answers over email, phone, or your account dashboard whenever you need it.' },
];

export default function Home() {
  return (
    <>
      <div className="hero">
        <div className="hero-img">
          <RipplesBackground imageUrl="/hero.png" />
        </div>
        <div className="hero-content">
          <div className="hero-eyebrow"><span className="line" />{BRAND.tagline}</div>
          <h1>
            Book flights for <em>your clients</em>
          </h1>
          <p className="hero-sub">
            Fast, reliable fares for your agency. Search, compare, and book with {BRAND.name}, clarity and speed, without the spreadsheet.
          </p>
        </div>
      </div>

      <div className="container searchbar-wrap">
        <SearchForm />
      </div>

      <FlyerSection />

      <div className="why">
        <div className="container">
          <div className="why-grid">
            {WHY_US.map(item => (
              <div className="why-item" key={item.num}>
                <span className="num">{item.num}</span>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="spacer" />
    </>
  );
}
