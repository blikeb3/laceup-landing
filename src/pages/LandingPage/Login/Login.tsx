import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function Login() {
  return (
    <div className="flex w-full h-screen bg-white">
      {/* Left Column - Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-10 relative h-full">
        {/* Logo at top left */}
        <div className="absolute top-10 left-10 flex items-center gap-2">
          <img src="/images/login/logo.png" alt="LaceUp Logo" className="w-[45px] h-[45px] object-cover" />
          <span className="text-[#0A2849] font-['Inter'] text-2xl tracking-[0.0167em]">LaceUp</span>
        </div>

        {/* Form Container */}
        <div className="w-[348px] max-w-full flex flex-col items-stretch">
          <div className="flex flex-col items-center w-full pb-6">
            <h2 className="text-[#0A2849] font-['Oswald'] font-semibold text-[23px] leading-6 text-center">
              Login to your account
            </h2>
            <p className="text-[#71717A] font-['Source_Sans_3'] text-base mt-2 text-center">
              Enter your email below to login to your account
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-2">
              <Label className="text-[#0A2849] font-['Inter'] font-medium text-sm">Email</Label>
              <Input 
                placeholder="m@example.com" 
                className="font-['Inter'] text-sm placeholder:text-[#71717A] border-[#E4E4E7] h-10 px-4 rounded-md focus-visible:ring-[#0A2849]"
              />
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <div className="flex items-center justify-between">
                <Label className="text-[#0A2849] font-['Inter'] font-medium text-sm">Password</Label>
                <a href="#" className="text-[#09090B] font-['Inter'] text-sm hover:underline absolute right-0 -top-[3px]">
                  Forgot your password?
                </a>
              </div>
              <Input 
                type="password"
                className="font-['Inter'] text-sm border-[#E4E4E7] h-10 px-4 rounded-md mt-1 focus-visible:ring-[#0A2849]"
              />
            </div>

            <Button className="w-full bg-[#0A2849] hover:bg-[#0A2849]/90 text-[#FAFAFA] font-['Inter'] font-medium text-sm h-10 rounded-md mt-2">
              Login
            </Button>
          </div>

          <div className="flex justify-center items-center w-full pt-4 gap-2.5">
            <p className="text-[#09090B] font-['Poppins'] text-sm text-center">
              <span className="font-['Inter'] text-[#71717A]">Don’t have an account? </span>
              <a href="#" className="font-['Inter'] underline text-[#09090B]">Sign up</a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Image */}
      <div className="hidden lg:flex flex-1 relative h-full bg-[#0A2849] items-center overflow-hidden">
        {/* Cover Image */}
        <div 
          className="absolute inset-0 w-full h-full"
        >
           <img 
            src="/images/login/cover-710f22.png" 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-[653px] bg-gradient-to-t from-[#0A2849] to-transparent pointer-events-none"></div>

        {/* LaceUp SVG Graphic Overlay */}
        <div className="absolute z-10 flex items-center bottom-[80px] right-[40px] xl:bottom-[15%] xl:right-[10%]">
          <img src="/images/login/laceup-graphic.svg" alt="LaceUp Icon" className="w-[180px] h-[180px] md:w-[233px] md:h-[233px]" />
          <h1 className="text-white font-['Source_Sans_Pro'] font-black text-[72px] md:text-[96px] leading-[90%] tracking-tight -ml-8 relative z-20">
            LACEUP
          </h1>
        </div>
      </div>
    </div>
  );
}
