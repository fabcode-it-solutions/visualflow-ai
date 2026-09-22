# Form Patterns — visualflow_frontend

## Standard Form Setup

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  shopName: z.string().min(2, 'Shop name must be at least 2 characters'),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',  // always onBlur — not onChange
  })

  const onSubmit = async (data: FormData) => {
    try {
      await someService.create(data)
      reset()
      toast.success('Saved successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed'
      // Map server error to field if known
      setError('root', { message })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        {...register('email')}
        error={errors.email?.message}
      />
      <Button type="submit" loading={isSubmitting} className="w-full">
        Save
      </Button>
      {errors.root && (
        <p className="text-sm text-red-600">{errors.root.message}</p>
      )}
    </form>
  )
}
```

## Multi-Step Form (Onboarding)

Use local state for step tracking. Validate per-step with trigger():

```tsx
const [step, setStep] = useState(1)

const goNext = async () => {
  const fieldsForStep: Record<number, (keyof FormData)[]> = {
    1: ['logoUrl', 'primaryColor', 'brandPersonality'],
    2: ['facebookConnected'],
    3: ['postsPerDay', 'language', 'budgetMin', 'budgetMax'],
  }
  const valid = await trigger(fieldsForStep[step])
  if (valid) setStep(s => s + 1)
}
```

## File Upload Field (react-dropzone)

```tsx
import { useDropzone } from 'react-dropzone'
import { Controller } from 'react-hook-form'

<Controller
  name="logoUrl"
  control={control}
  render={({ field }) => {
    const { getRootProps, getInputProps } = useDropzone({
      accept: { 'image/*': [] },
      maxFiles: 1,
      onDrop: async (files) => {
        const url = await brandService.uploadLogo(files[0])
        field.onChange(url)
      },
    })
    return (
      <div {...getRootProps()} className="border-2 border-dashed 
        border-surface-300 rounded-xl p-6 text-center cursor-pointer
        min-h-[120px] flex items-center justify-center
        active:bg-surface-50">
        <input {...getInputProps()} />
        <p className="text-sm text-zinc-500">
          Tap to upload logo
        </p>
      </div>
    )
  }}
/>
```

## Color Picker Field

```tsx
import { HexColorPicker } from 'react-colorful'
import { Controller } from 'react-hook-form'

<Controller
  name="primaryColor"
  control={control}
  render={({ field }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-700">
        Primary Color
      </label>
      <HexColorPicker color={field.value} onChange={field.onChange} />
      <Input value={field.value} onChange={field.onChange} />
    </div>
  )}
/>
```
