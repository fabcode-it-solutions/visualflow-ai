import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import api from '@/services/api'
import { shopService } from '@/services/shopService'
import { useShopStore } from '@/store/shopStore'
import { useToast } from '@/hooks/useToast'
import { ChevronRight, ChevronLeft, CheckCircle2, HelpCircle } from 'lucide-react'
import { VALID_TIME_SLOTS } from '@/utils/constants'
import { Logo } from '@/components/shared/Logo'
import Step1BrandGuide from './steps/Step1BrandGuide'
import Step2SocialConnect from './steps/Step2SocialConnect'
import Step3Preferences from './steps/Step3Preferences'
import Step4Festivals from './steps/Step4Festivals'
import Step5Done from './steps/Step5Done'

export interface OnboardingData {
  brandName?: string
  logoUrl?: string
  websiteUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFont: string
  bodyFont: string
  brandPersonality: string
  photoStyle: string
  voiceLanguage?: string
  referenceImages: string[]
  trustSignals: string[]
  facebookConnected: boolean
  instagramConnected: boolean
  postsPerDay: number
  postingTimes: string[]
  language: string
  budgetMin: number
  budgetMax: number
  autoApprove: boolean
  inventoryThreshold: number
  smartTiming: boolean
  selectedFestivals: string[]
  contentGenerationTime: string
  notificationTime: string
}

const STEPS = [
  { title: 'Brand Guide', subtitle: 'Set up your brand', icon: '🎨', component: Step1BrandGuide },
  { title: 'Social Connect', subtitle: 'Connect accounts', icon: '📱', component: Step2SocialConnect },
  { title: 'Preferences', subtitle: 'Configure settings', icon: '⚙️', component: Step3Preferences },
  { title: 'Festivals', subtitle: 'Select events', icon: '🎊', component: Step4Festivals },
  { title: 'Done', subtitle: 'All set', icon: '🚀', component: Step5Done },
]

const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  brandName: undefined,
  websiteUrl: undefined,
  primaryColor: '#7c3aed',
  secondaryColor: '#ffffff',
  accentColor: '#f59e0b',
  backgroundColor: '#ffffff',
  headingFont: 'Plus Jakarta Sans',
  bodyFont: 'Inter',
  brandPersonality: '',
  photoStyle: '',
  referenceImages: [],
  trustSignals: ['cod', 'free_delivery', 'easy_returns'],
  facebookConnected: false,
  instagramConnected: false,
  postsPerDay: 1,
  postingTimes: [],
  language: 'english',
  budgetMin: 200,
  budgetMax: 500,
  autoApprove: false,
  inventoryThreshold: 5,
  smartTiming: false,
  selectedFestivals: [],
  contentGenerationTime: '02:00',
  notificationTime: '08:00',
}

export default function Onboarding() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const setIsShopOnboarded = useShopStore(s => s.setIsShopOnboarded)
  const backendStep = useShopStore(s => s.onboardingStep)
  const setOnboardingStep = useShopStore(s => s.setOnboardingStep)

  // Determine starting step: URL param (highest priority) > backend saved step > default 1
  // URL is 1-based, internal state is 0-based
  const urlStep = Number(searchParams.get('step')) || 0
  const resumeStep = Math.max(urlStep, backendStep)
  const initialStep = resumeStep > 0 && resumeStep <= STEPS.length ? resumeStep - 1 : 0

  const [step, setStep] = useState(initialStep)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(DEFAULT_ONBOARDING_DATA)

  // Fetch saved onboarding data from backend and hydrate form state
  const { data: savedData } = useQuery({
    queryKey: ['onboarding-data'],
    queryFn: shopService.getOnboardingData,
    staleTime: Infinity, // only fetch once per mount
    retry: 1,
  })

  useEffect(() => {
    if (!savedData) return
    setOnboardingData(prev => ({
      ...prev,
      // Brand
      ...(savedData.brand && {
        websiteUrl: savedData.brand.websiteUrl,
        logoUrl: savedData.brand.logoUrl,
        primaryColor: savedData.brand.primaryColor,
        secondaryColor: savedData.brand.secondaryColor,
        accentColor: savedData.brand.accentColor,
        backgroundColor: savedData.brand.backgroundColor,
        headingFont: savedData.brand.headingFont,
        bodyFont: savedData.brand.bodyFont,
        brandPersonality: savedData.brand.brandPersonality,
        photoStyle: savedData.brand.photoStyle,
        referenceImages: savedData.brand.referenceImages ?? [],
        trustSignals: Array.isArray(savedData.brand.trustSignals) ? savedData.brand.trustSignals : ['cod', 'free_delivery', 'easy_returns'],
      }),
      // Preferences
      ...(savedData.preferences && {
        postsPerDay: savedData.preferences.postsPerDay,
        postingTimes: (savedData.preferences.postingTimes ?? []).filter((t: string) => (VALID_TIME_SLOTS as readonly string[]).includes(t)),
        language: savedData.preferences.language,
        budgetMin: savedData.preferences.budgetMin,
        budgetMax: savedData.preferences.budgetMax,
        autoApprove: savedData.preferences.autoApprove,
        inventoryThreshold: savedData.preferences.inventoryThreshold,
        smartTiming: savedData.preferences.smartTiming,
        selectedFestivals: savedData.preferences.selectedFestivalIds,
        contentGenerationTime: savedData.preferences.contentGenerationTime ?? '02:00',
        notificationTime: savedData.preferences.notificationTime ?? '08:00',
      }),
      // Social connection status
      facebookConnected: savedData.social.facebookConnected,
      instagramConnected: savedData.social.instagramConnected,
    }))
  }, [savedData])
  const [step1Errors, setStep1Errors] = useState<{ brandPersonality?: string; photoStyle?: string }>({})
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({})
  const [step4Error, setStep4Error] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | undefined>(undefined)
  const [isUploadingRefImages, setIsUploadingRefImages] = useState(false)
  const [step1CanProceed, setStep1CanProceed] = useState(false)

  const { mutateAsync: saveBrand, isPending: isSavingBrand } = useMutation({
    mutationFn: async () => {
      let logoUrl = onboardingData.logoUrl

      // If a new logo file was selected, upload it first
      if (logoFile) {
        const formData = new FormData()
        formData.append('logo', logoFile)
        const uploadResponse = await api.post<{ logoUrl: string }>('/brand/upload-logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        logoUrl = uploadResponse.data.logoUrl
      } else if (logoUrl?.startsWith('blob:')) {
        // Blob URL from a previous session - clear it
        logoUrl = undefined
      }

      return shopService.saveBrandSettings({
        brandName: onboardingData.brandName,
        logoUrl,
        websiteUrl: onboardingData.websiteUrl,
        primaryColor: onboardingData.primaryColor,
        secondaryColor: onboardingData.secondaryColor,
        accentColor: onboardingData.accentColor,
        backgroundColor: onboardingData.backgroundColor,
        headingFont: onboardingData.headingFont,
        bodyFont: onboardingData.bodyFont,
        brandPersonality: onboardingData.brandPersonality,
        photoStyle: onboardingData.photoStyle,
        referenceImages: onboardingData.referenceImages,
        trustSignals: onboardingData.trustSignals,
      })
    },
    onError: () => showToast('Failed to save brand settings', 'error'),
  })

  const { mutateAsync: savePreferences, isPending: isSavingPreferences } = useMutation({
    mutationFn: () => shopService.savePreferences({
      postsPerDay: onboardingData.postsPerDay,
      postingTimes: onboardingData.postingTimes,
      language: onboardingData.language,
      budgetMin: onboardingData.budgetMin,
      budgetMax: onboardingData.budgetMax,
      autoApprove: onboardingData.autoApprove,
      inventoryThreshold: onboardingData.inventoryThreshold,
      smartTiming: onboardingData.smartTiming,
      contentGenerationTime: onboardingData.contentGenerationTime,
      notificationTime: onboardingData.notificationTime,
    }),
    onError: () => showToast('Failed to save preferences', 'error'),
  })

  const { mutateAsync: saveFestivals, isPending: isSavingFestivals } = useMutation({
    mutationFn: () => shopService.saveFestivals({
      selectedFestivals: onboardingData.selectedFestivals,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['festivals'] }),
    onError: () => showToast('Failed to save festivals', 'error'),
  })

  const { mutateAsync: saveStep, isPending: isSavingStep } = useMutation({
    mutationFn: shopService.saveOnboardingStep,
  })

  const { mutate: completeOnboarding, isPending: isCompleting } = useMutation({
    mutationFn: () => shopService.completeOnboarding(),
    onSuccess: () => {
      setIsShopOnboarded(true)
      navigate('/')
    },
    onError: () => showToast('Failed to complete onboarding', 'error'),
  })

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }))
  }, [])

  const togglePostingTime = useCallback((time: string) => {
    setOnboardingData(prev => ({
      ...prev,
      postingTimes: prev.postingTimes.includes(time)
        ? prev.postingTimes.filter(t => t !== time)
        : [...prev.postingTimes, time],
    }))
  }, [])

  const validateStep1 = useCallback((): boolean => {
    const newErrors: typeof step1Errors = {}
    if (!onboardingData.brandPersonality) {
      newErrors.brandPersonality = 'Please select a brand voice'
    }
    if (!onboardingData.photoStyle) {
      newErrors.photoStyle = 'Please select a content style'
    }
    setStep1Errors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      document.getElementById('brand-personality-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return Object.keys(newErrors).length === 0
  }, [onboardingData.brandPersonality, onboardingData.photoStyle])

  const validateStep2 = useCallback((): boolean => {
    if (!onboardingData.facebookConnected) {
      setStep2Error('Please connect your Facebook account to continue')
      return false
    }
    setStep2Error(null)
    return true
  }, [onboardingData.facebookConnected])

  const validateStep3 = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (!onboardingData.smartTiming && onboardingData.postingTimes.length === 0) {
      newErrors.postingTimes = 'Please select at least one posting time'
    }
    if (onboardingData.budgetMin < 100) {
      newErrors.budgetMin = 'Minimum budget must be at least ₹100'
    }
    if (onboardingData.budgetMax < onboardingData.budgetMin + 100) {
      newErrors.budgetMax = 'Maximum must be at least ₹100 more than minimum'
    }
    setStep3Errors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [onboardingData.smartTiming, onboardingData.postingTimes.length, onboardingData.budgetMin, onboardingData.budgetMax])

  const validateStep4 = useCallback((): boolean => {
    if (onboardingData.selectedFestivals.length === 0) {
      setStep4Error('Please select at least one festival')
      return false
    }
    setStep4Error(null)
    return true
  }, [onboardingData.selectedFestivals.length])

  const goNext = useCallback(async () => {
    if (step === STEPS.length - 1) return

    let isValid = true

    try {
      if (step === 0) {
        isValid = validateStep1()
        if (isValid) await saveBrand()
      } else if (step === 1) {
        isValid = validateStep2()
      } else if (step === 2) {
        isValid = validateStep3()
        if (isValid) await savePreferences()
      } else if (step === 3) {
        isValid = validateStep4()
        if (isValid) await saveFestivals()
      }

      if (isValid) {
        const nextStep = step + 1
        const nextStepOneBased = nextStep + 1
        await saveStep(nextStepOneBased)
        setStep(nextStep)
        setSearchParams({ step: String(nextStepOneBased) })
        setOnboardingStep(nextStepOneBased)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch {
      // Error already handled by mutation onError callbacks
    }
  }, [step, validateStep1, validateStep2, validateStep3, validateStep4, saveBrand, savePreferences, saveFestivals, setSearchParams, saveStep, setOnboardingStep])

  const goBack = useCallback(() => {
    if (step > 0) {
      const prevStep = step - 1
      setStep(prevStep)
      setSearchParams({ step: String(prevStep + 1) })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step, setSearchParams])

  const handleComplete = useCallback(() => {
    completeOnboarding()
  }, [completeOnboarding])

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [step])

  const isLast = step === STEPS.length - 1
  const progressPct = Math.round(((step + 1) / STEPS.length) * 100)
  const isLoading = isSavingBrand || isSavingPreferences || isSavingFestivals || isSavingStep || isCompleting
  const isNextDisabled = isLoading || (step === 0 && isUploadingRefImages) || (step === 0 && !step1CanProceed)

  return (
    <div className="h-screen bg-white flex overflow-hidden safe-top safe-bottom">
      {/* Left Panel - Desktop Only */}
      <div className="hidden lg:flex lg:w-[35%] bg-zinc-950 text-white flex-col sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-6 pb-8 border-b border-white/10">
          <Logo size="sm" showText={true} textColor="light" />
          <p className="text-zinc-500 text-xs mt-1 ml-9">AI Social Manager</p>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="space-y-1">
            {STEPS.map((s, i) => {
              const isActive = i === step
              const isCompleted = i < step
              return (
                <div key={s.title}>
                  <button
                    onClick={() => i < step && setStep(i)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : isCompleted
                          ? 'text-zinc-400 hover:bg-zinc-800/50 cursor-pointer'
                          : 'text-zinc-500 hover:bg-zinc-800/30 cursor-default'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5 ${
                        isActive
                          ? 'bg-white text-brand-600'
                          : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'border border-zinc-600 text-zinc-400'
                      }`}>
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : (i + 1)}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-inherit'}`}>
                          {s.title}
                        </p>
                        <p className={`text-xs ${isActive ? 'text-brand-100' : 'text-zinc-500'}`}>
                          {s.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-6 border-l-2 ml-9 ${
                      i < step ? 'border-emerald-500' : 'border-zinc-700'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-6 border-t border-zinc-800 space-y-3">
          <button className="w-full text-left flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors cursor-pointer">
            <HelpCircle className="w-4 h-4" />
            <span>Need help?</span>
          </button>
          <p className="text-xs text-zinc-600 text-center">
            Powered by VisualFlow AI
          </p>
        </div>
      </div>

      {/* Right Panel - Content Area */}
      <div className="w-full lg:w-[65%] flex flex-col bg-white overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-surface-100">
          <motion.div
            className="h-full bg-linear-to-r from-brand-600 to-brand-500"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden px-4 py-4 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-zinc-500 font-medium">STEP {step + 1} OF {STEPS.length}</p>
              <h1 className="font-display font-bold text-lg text-zinc-900">{STEPS[step].title}</h1>
            </div>
            <span className="text-2xl">{STEPS[step].icon}</span>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="w-full max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-12">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                {step === 0 && (
                  <Step1BrandGuide data={onboardingData} updateData={updateData} onLogoFileChange={setLogoFile} onUploadingChange={setIsUploadingRefImages} onCanProceedChange={setStep1CanProceed} errors={step1Errors} />
                )}
                {step === 1 && (
                  <Step2SocialConnect data={onboardingData} updateData={updateData} errors={{ facebookError: step2Error }} />
                )}
                {step === 2 && (
                  <Step3Preferences data={onboardingData} updateData={updateData} onToggleTime={togglePostingTime} errors={step3Errors} />
                )}
                {step === 3 && (
                  <Step4Festivals data={onboardingData} updateData={updateData} errors={{ festivalError: step4Error }} />
                )}
                {step === 4 && (
                  <Step5Done data={onboardingData} updateData={updateData} onComplete={handleComplete} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-4 md:px-8 py-4 border-t border-zinc-100 bg-white">
          <div className="w-full max-w-2xl mx-auto flex gap-3">
            {!isLast && step > 0 && (
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                leftIcon={<ChevronLeft className="h-4 w-4" />}
                onClick={goBack}
              >
                Back
              </Button>
            )}
            {isLast ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                loading={isCompleting}
                onClick={handleComplete}
              >
                Go to Dashboard
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                className={step === 0 ? 'w-full' : 'flex-1'}
                loading={isLoading}
                disabled={isNextDisabled}
                rightIcon={<ChevronRight className="h-4 w-4" />}
                onClick={goNext}
              >
                {step === 0 && isUploadingRefImages
                  ? 'Uploading images…'
                  : step === STEPS.length - 2
                    ? 'Complete Setup'
                    : 'Next'}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Step Dots */}
        {!isLast && (
          <div className="lg:hidden px-4 py-3 flex justify-center gap-2">
            {STEPS.slice(0, -1).map((_, i) => (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === step ? 'w-8 bg-brand-600' : i < step ? 'w-2 bg-emerald-500 cursor-pointer' : 'w-2 bg-surface-200 cursor-default'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
