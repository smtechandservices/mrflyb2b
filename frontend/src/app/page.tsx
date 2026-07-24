import { SearchForm } from '@/components/SearchForm';
import { RipplesBackground } from '@/components/RipplesBackground';
import FlyerSection from '@/components/FlyerSection';
import { BRAND } from '@/config/brand';

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <div className="w-full h-[60vh] md:h-[80vh] relative overflow-hidden">
        <RipplesBackground imageUrl="/hero.png">
          <div className="w-full h-full flex items-center justify-center text-center px-4 md:px-6">
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/20" />

            <div className="relative z-10 max-w-4xl mx-auto">
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 md:mb-6 tracking-tight">
                Discover Your Next <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">Adventure</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
                Premium flights to destinations around the globe. Experience comfort, luxury, and seamless travel with {BRAND.name}.
              </p>
            </div>
          </div>
        </RipplesBackground>
      </div>

      <div className="w-full max-w-9xl px-4 md:px-12 mx-auto pb-20 bg-white">
        <SearchForm />

        <FlyerSection />

        <br /><br />
        {/* <div className="mt-12 md:mt-20">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8 md:mb-10 text-center">Popular Destinations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            <DestinationCard
              image="/images/new_york.png"
              city="New York"
              country="USA"
              price="₹85,000"
            />
            <DestinationCard
              image="/images/london.png"
              city="London"
              country="UK"
              price="₹92,000"
            />
            <DestinationCard
              image="/images/kyoto.png"
              city="Kyoto"
              country="Japan"
              price="₹1,15,000"
            />
          </div>
        </div> */}
      </div>
    </div>
  );
}

function DestinationCard({ image, city, country, price }: { image: string, city: string, country: string, price: string }) {
  return (
    <div className="group relative h-72 sm:h-80 md:h-96 rounded-3xl overflow-hidden cursor-pointer">
      <img src={image} alt={city} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
      <div className="absolute bottom-0 left-0 p-8 text-white w-full">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-3xl font-bold mb-1">{city}</h3>
            <p className="text-gray-300 font-medium">{country}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl font-bold">
            from {price}
          </div>
        </div>
      </div>
    </div>
  );
}
