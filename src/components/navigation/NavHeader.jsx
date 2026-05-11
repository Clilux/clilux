import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function NavHeader({ title, showBack = true, showHome = true, backUrl = null, homeUrl = 'HomeTecnico' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(createPageUrl(backUrl));
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(createPageUrl(homeUrl));
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {showBack &&
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="rounded-full hover:bg-white/10 text-white">
          
            <ArrowLeft className="h-5 w-5" />
          </Button>
        }
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
      </div>
      {showHome &&
      <Link to={createPageUrl(homeUrl)}>
          <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-white/10 text-gray-900 bg-[#ffffff]">
          
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      }
    </div>);

}