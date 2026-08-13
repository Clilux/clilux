import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function NavHeader({ title, showBack = true, showHome = true, backUrl = null, homeUrl = 'HomeTecnico' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backUrl) {
      navigate(backUrl.startsWith('/') ? backUrl : createPageUrl(backUrl));
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6 ui-select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-3">
        {showBack &&
        <Button
          onClick={handleBack}
          className="rounded-full h-11 w-11 p-0 bg-[#1E40AF] text-white hover:bg-[#1E3A8A] shadow-md">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        }
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">{title}</h1>
      </div>
      {showHome &&
      <Link to={createPageUrl(homeUrl)}>
          <Button
          className="rounded-full h-11 w-11 p-0 bg-[#1E40AF] text-white hover:bg-[#1E3A8A] shadow-md">
            <Home className="h-6 w-6" />
          </Button>
        </Link>
      }
    </div>);

}