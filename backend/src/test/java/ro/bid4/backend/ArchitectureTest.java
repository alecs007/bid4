package ro.bid4.backend;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "ro.bid4.backend", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
  private static final String[] FEATURES = {
    "ro.bid4.backend.identity..",
    "ro.bid4.backend.cause..",
    "ro.bid4.backend.catalog..",
    "ro.bid4.backend.orders..",
    "ro.bid4.backend.inbox..",
    "ro.bid4.backend.ledger..",
    "ro.bid4.backend.shipping..",
    "ro.bid4.backend.payments..",
    "ro.bid4.backend.billing..",
    "ro.bid4.backend.storage.."
  };

  @ArchTest
  static final ArchRule controllersDoNotTouchTheDatabase =
      noClasses()
          .that()
          .resideInAPackage("ro.bid4.backend..api..")
          .should()
          .dependOnClassesThat()
          .resideInAPackage("ro.bid4.backend..repo..")
          .because("a controller that queries directly is a service nobody can reuse or test");

  @ArchTest
  static final ArchRule commonKnowsNothingOfFeatures =
      noClasses()
          .that()
          .resideInAPackage("ro.bid4.backend.common..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage(FEATURES)
          .because("common is the shared floor and must not know what is built on it");

  @ArchTest
  static final ArchRule repositoriesAreInterfaces =
      classes()
          .that()
          .resideInAPackage("ro.bid4.backend..repo..")
          .should()
          .beInterfaces()
          .because("Spring Data writes the implementation; a class here is a mistake");

  @ArchTest
  static final ArchRule entitiesDoNotReachControllers =
      noClasses()
          .that()
          .resideInAPackage("ro.bid4.backend..api")
          .should()
          .dependOnClassesThat()
          .resideInAPackage("ro.bid4.backend..domain")
          .because("controllers speak DTOs, so no request can bind onto a table row");

  @ArchTest
  static final ArchRule noFieldInjection =
      noClasses()
          .should()
          .beAnnotatedWith("org.springframework.beans.factory.annotation.Autowired")
          .because("constructor injection makes a missing dependency a compile error");
}
