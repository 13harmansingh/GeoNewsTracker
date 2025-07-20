import { Menu, User } from "lucide-react";

export default function NavigationBar() {
  const handleMenuClick = () => {
    // TODO: Implement menu functionality
    console.log("Menu clicked");
  };

  const handleProfileClick = () => {
    // TODO: Implement profile functionality
    console.log("Profile clicked");
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-30">
      <div className="glass-morphism mx-4 mt-12 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={handleMenuClick}
            className="touch-feedback p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-800 tracking-tight">
            GeoNews
          </h1>
          
          <button 
            onClick={handleProfileClick}
            className="touch-feedback p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all"
          >
            <User className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>
    </div>
  );
}