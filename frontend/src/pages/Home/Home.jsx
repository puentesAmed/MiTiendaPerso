import {
  Box,
  Button,
  Heading,
  Text,
  Image,
  SimpleGrid,
  Stack,
  useColorModeValue,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

// === Swiper (Slider profesional) ===
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

const MotionBox = motion(Box);

export function Home() {
  const navigate = useNavigate();
  const bg = useColorModeValue("#F7F7FA", "gray.900");

  return (
    <Box bg={bg} minH="100vh">

      {/* ================= HERO ANIMADO ================= */}
      <MotionBox
        initial={{ opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        textAlign="center"
        py={{ base: 12, md: 20 }}
        px={6}
      >
        <Heading
          fontSize={{ base: "2.8rem", md: "4rem" }}
          fontWeight="bold"
          bgGradient="linear(to-r, #3B82F6, #EC4899)"
          bgClip="text"
        >
          Personaliza tus productos como nunca antes
        </Heading>

        <Text
          mt={4}
          fontSize={{ base: "md", md: "lg" }}
          color="gray.600"
        >
          Tazas, camisetas, accesorios y regalos totalmente personalizados.  
        </Text>

        <Button
          mt={6}
          size="lg"
          bg="#3B82F6"
          color="white"
          rightIcon={<ArrowForwardIcon />}
          _hover={{ bg: "#2563eb" }}
          onClick={() => navigate("/productos")}
        >
          Ver catálogo
        </Button>
      </MotionBox>

      {/* ================= SLIDER PROFESIONAL ================= */}
      <Box px={{ base: 4, md: 20 }} mt={6}>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 3500 }}
          loop
          style={{ borderRadius: "18px" }}
        >
          {[
            { img: "/images/banner1.jpg", title: "Crea tu propio diseño" },
            { img: "/images/banner2.jpg", title: "Regalos personalizados" },
            { img: "/images/banner3.jpg", title: "Nuevas colecciones" },
          ].map((b, i) => (
            <SwiperSlide key={i}>
              <MotionBox whileHover={{ scale: 1.01 }}>
                <Image
                  src={b.img}
                  alt={b.title}
                  borderRadius="xl"
                  w="100%"
                  h={{ base: "240px", md: "380px" }}
                  objectFit="fill"
                />
              </MotionBox>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>

      {/* ================= BANNERS ANIMADOS ================= */}
      <SimpleGrid
        columns={{ base: 1, md: 3 }}
        spacing={6}
        mt={16}
        px={{ base: 4, md: 20 }}
      >
        {[ 
          { color: "#3B82F6", text: "Diseña productos únicos" },
          { color: "#EC4899", text: "Regalos para ocasiones especiales" },
          { color: "#4ADE80", text: "Ofertas y descuentos exclusivos" },
        ].map((banner, i) => (
          <MotionBox
            key={i}
            height="160px"
            borderRadius="xl"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            bg={banner.color}
            color="white"
            fontSize="lg"
            fontWeight="bold"
            whileHover={{ scale: 1.05, boxShadow: "lg" }}
            onClick={() => navigate("/productos")}
          >
            {banner.text}
          </MotionBox>
        ))}
      </SimpleGrid>

      {/* ================= PRODUCTOS DESTACADOS ================= */}
      <Box mt={20} px={{ base: 4, md: 20 }}>
        <Heading size="lg" mb={6}>
          Productos destacados
        </Heading>

        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={8}>
          {[1, 2, 3].map((p) => (
            <MotionBox
              key={p}
              bg="white"
              p={4}
              borderRadius="xl"
              boxShadow="md"
              whileHover={{ scale: 1.03 }}
            >
              <Image
                src={`/img/prod${p}.jpg`}
                alt="Producto personalizado"
                borderRadius="lg"
                h="220px"
                w="100%"
                objectFit="cover"
              />
              <Heading size="md" mt={3}>
                Producto {p}
              </Heading>
              <Text mt={1} color="gray.500" fontSize="sm">
                Personalízalo a tu gusto.
              </Text>
              <Button
                mt={4}
                size="sm"
                colorScheme="pink"
                w="full"
                onClick={() => navigate(`/producto/${p}`)}
              >
                Personalizar
              </Button>
            </MotionBox>
          ))}
        </SimpleGrid>
      </Box>

      <Box textAlign="center" mt={20} pb={10}>
        <Heading size="lg">¿Listo para crear algo único?</Heading>
        <Button
          mt={4}
          size="lg"
          bg="#EC4899"
          color="white"
          _hover={{ bg: "#db2777" }}
          onClick={() => navigate("/productos")}
        >
          Empezar ahora
        </Button>
      </Box>
    </Box>
  );
}
