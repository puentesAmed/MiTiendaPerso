import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Button, Input, useColorModeValue } from '@chakra-ui/react'




const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
export function Login(){
  const bg = useColorModeValue('white','neutral.800')
  const border = useColorModeValue('neutral.200','neutral.700')
  const btnBg    = useColorModeValue('brand.500', 'accent.500');
  const btnHover = useColorModeValue('brand.600', 'accent.600');
  const btnColor = useColorModeValue('white', 'black');
  const { register, handleSubmit, formState:{ errors, isSubmitting } } = useForm({ resolver: zodResolver(schema)})
  const { login } = useAuth(); const nav = useNavigate(); const loc = useLocation()
  const onSubmit = async (data) => {
  try {
    // Llamada real al backend
    const { data: r } = await api.post('/auth/login', data);
    r.user = { id, email, name, role }, r.token = JWT
    login(r.user, r.token); // guarda usuario y token en Zustand persistente

    // Redirige a la página original o dashboard
    nav((loc.state?.from?.pathname) || '/dashboard', { replace: true });
  } catch (err) {
    console.error('Login error', err);
    alert('Credenciales incorrectas');
  }
};


  return (
    <Box maxW="420px" mx="auto" mt={8} p={6} bg={bg} border="1px solid" borderColor={border} rounded="lg">
      <div className="container" style={{maxWidth:420}}>
        <div className="card"><h2>Iniciar sesión</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="grid">
            <div><label>Email</label><input className="input" type="email" {...register('email')}/>{errors.email&&<small style={{color:'var(--color-danger)'}}>{errors.email.message}</small>}</div>
            <div><label>Contraseña</label><input className="input" type="password" {...register('password')}/>{errors.password&&<small style={{color:'var(--color-danger)'}}>{errors.password.message}</small>}</div>
            <Button
              bg={btnBg}
              color={btnColor}
              _hover={{ bg: btnHover }}
              onClick={handleSubmit(onSubmit)} // si es un form
              isLoading={isSubmitting}         // Chakra muestra un spinner automáticamente
              loadingText="Accediendo"         // texto cuando está cargando
            >
              Entrar
            </Button>

          </form>
        </div>
      </div>
    </Box>
  )
}

