package com.antar.authservice.repository;

import com.antar.authservice.model.Microservice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MicroserviceRepository extends JpaRepository<Microservice, String> {
}
